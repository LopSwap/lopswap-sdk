import {
  isAddress,
  isAddressEqual,
  isHex,
  keccak256,
  verifyTypedData,
  type Address,
} from 'viem'
import type { LopSwapContracts } from './config.js'
import {
  MAX_UINT256,
  ORDER_DOMAIN_NAME,
  ORDER_DOMAIN_VERSION,
} from './config.js'
import { buildOrderTypedData, ORDER_TYPES } from './orders.js'
import {
  PoolType,
  type OrderTypedData,
  type PoolOrder,
  type PreparedPool,
  type SignedPool,
} from './types.js'

const UINT256_MAX = MAX_UINT256
const LOWER_160_BITS = (1n << 160n) - 1n
const EXPIRATION_MASK = (1n << 40n) - 1n
const MAKER_RECEIVES_FEE_FLAG = 0x80n
const HAS_EXTENSION_FLAG = 249n
const NEED_POST_INTERACTION_FLAG = 251n
const NEED_PRE_INTERACTION_FLAG = 252n
const ALLOW_MULTIPLE_FILLS_FLAG = 254n
const NO_PARTIAL_FILLS_FLAG = 255n

/** Error raised when a prepared or signed pool fails local validation. */
export class LopSwapValidationError extends Error {
  override readonly name = 'LopSwapValidationError'
}

export function validatePreparedPool(
  pool: PreparedPool,
  expectedChainId: number,
  contracts: LopSwapContracts,
): void {
  assert(
    pool.chainId === expectedChainId,
    'Pool chain does not match SDK chain',
  )
  assert(
    pool.type === PoolType.AMM || pool.type === PoolType.FLASHLOAN,
    'Unsupported pool type',
  )

  const expectedOrderCount = pool.type === PoolType.AMM ? 2 : 1
  assert(
    pool.orders.length === expectedOrderCount,
    `${pool.type} pool requires ${expectedOrderCount} order(s)`,
  )
  assert(
    pool.typedData.length === expectedOrderCount,
    'Typed data count does not match order count',
  )

  const expectedReceiver =
    pool.type === PoolType.AMM ? contracts.ammPool : contracts.flashLoanPool

  for (const [index, order] of pool.orders.entries()) {
    validateOrder(order, expectedReceiver)
    validateTypedData(
      pool.typedData[index],
      order,
      expectedChainId,
      contracts.limitOrderProtocol,
    )
  }

  if (pool.type === PoolType.AMM) {
    validateReciprocalOrders(pool.orders[0], pool.orders[1])
  } else {
    const order = pool.orders[0]
    assert(order !== undefined, 'Flash-loan order is missing')
    assertAddressEqual(
      order.takerAsset,
      contracts.erc20True,
      'Flash-loan takerAsset must be ERC20True',
    )
  }
}

export async function validateSignedPool(
  pool: SignedPool,
  expectedChainId: number,
  contracts: LopSwapContracts,
): Promise<void> {
  validatePreparedPool(pool, expectedChainId, contracts)
  assert(
    pool.signatures.length === pool.orders.length,
    'Signature count does not match order count',
  )

  for (const [index, order] of pool.orders.entries()) {
    const signature = pool.signatures[index]
    assert(
      signature !== undefined && isHex(signature),
      `Signature ${index} is invalid`,
    )

    const typedData = buildOrderTypedData(
      order,
      expectedChainId,
      contracts.limitOrderProtocol,
    )
    let valid: boolean
    try {
      valid = await verifyTypedData({
        address: order.maker,
        signature,
        ...typedData,
      })
    } catch {
      valid = false
    }
    assert(valid, `Signature ${index} does not match the order maker`)
  }
}

function validateOrder(order: PoolOrder, expectedReceiver: Address): void {
  validateAddress(order.maker, 'maker')
  validateAddress(order.receiver, 'receiver')
  validateAddress(order.makerAsset, 'makerAsset')
  validateAddress(order.takerAsset, 'takerAsset')
  assertAddressEqual(
    order.receiver,
    expectedReceiver,
    'Order receiver does not match the configured pool contract',
  )
  assert(
    !isAddressEqual(order.makerAsset, order.takerAsset),
    'Order assets must be different',
  )

  validateUint256(order.salt, 'salt')
  validateEncodedAmount(order.makingAmount, 'makingAmount')
  validateEncodedAmount(order.takingAmount, 'takingAmount')
  validateUint256(order.makerTraits, 'makerTraits')
  validateMakerTraits(order.makerTraits)
  validateExtension(order)

  const extensionHash = BigInt(keccak256(order.extension)) & LOWER_160_BITS
  assert(
    (order.salt & LOWER_160_BITS) === extensionHash,
    'Order salt does not match the extension hash',
  )
}

function validateMakerTraits(makerTraits: bigint): void {
  assertFlag(
    makerTraits,
    HAS_EXTENSION_FLAG,
    true,
    'Extension flag must be enabled',
  )
  assertFlag(
    makerTraits,
    NEED_PRE_INTERACTION_FLAG,
    true,
    'Pre-interaction flag must be enabled',
  )
  assertFlag(
    makerTraits,
    NEED_POST_INTERACTION_FLAG,
    true,
    'Post-interaction flag must be enabled',
  )
  assertFlag(
    makerTraits,
    ALLOW_MULTIPLE_FILLS_FLAG,
    true,
    'Multiple fills must be enabled',
  )
  assertFlag(
    makerTraits,
    NO_PARTIAL_FILLS_FLAG,
    false,
    'Partial fills must be enabled',
  )

  const expiration = (makerTraits >> 80n) & EXPIRATION_MASK
  assert(
    expiration > BigInt(Math.floor(Date.now() / 1_000)),
    'Order expiration must be in the future',
  )
}

function validateExtension(order: PoolOrder): void {
  assert(isHex(order.extension), 'Order extension must be hex encoded')

  const flags = (order.salt >> 248n) & 0xffn
  assert(
    flags === 0n || flags === MAKER_RECEIVES_FEE_FLAG,
    'Order salt contains unsupported flags',
  )
  const makerReceivesFee = flags === MAKER_RECEIVES_FEE_FLAG
  const expectedLength = makerReceivesFee ? 226 : 266
  assert(
    order.extension.length === expectedLength,
    'Order extension has an invalid length',
  )

  const expectedOffsets = buildExpectedOffsets(makerReceivesFee)
  assert(
    order.extension.slice(2, 66).toLowerCase() === expectedOffsets,
    'Order extension has invalid offsets',
  )

  for (const start of [66, 106, 146, 186]) {
    const address = `0x${order.extension.slice(start, start + 40)}` as Address
    assertAddressEqual(
      address,
      order.receiver,
      'Order extension contains an unexpected interaction contract',
    )
  }

  if (!makerReceivesFee) {
    const providerFeeReceiver = `0x${order.extension.slice(226, 266)}`
    assert(isAddress(providerFeeReceiver), 'Provider fee receiver is invalid')
  }
}

function validateTypedData(
  typedData: OrderTypedData | undefined,
  order: PoolOrder,
  chainId: number,
  limitOrderProtocol: Address,
): void {
  assert(typedData !== undefined, 'Order typed data is missing')
  assert(
    typedData.primaryType === 'Order',
    'Typed data primaryType must be Order',
  )
  assert(
    JSON.stringify(typedData.types) === JSON.stringify(ORDER_TYPES),
    'Typed data types are invalid',
  )
  assert(
    typedData.domain.name === ORDER_DOMAIN_NAME,
    'Typed data name is invalid',
  )
  assert(
    typedData.domain.version === ORDER_DOMAIN_VERSION,
    'Typed data version is invalid',
  )
  assert(typedData.domain.chainId === chainId, 'Typed data chain is invalid')
  assertAddressEqual(
    typedData.domain.verifyingContract,
    limitOrderProtocol,
    'Typed data verifying contract is invalid',
  )
  assertOrdersEqual(
    typedData.message,
    order,
    'Typed data message does not match the order',
  )
}

function validateReciprocalOrders(
  first: PoolOrder | undefined,
  second: PoolOrder | undefined,
): void {
  assert(first !== undefined && second !== undefined, 'AMM orders are missing')
  assert(first.salt === second.salt, 'AMM orders must use the same salt')
  assertAddressEqual(
    first.maker,
    second.maker,
    'AMM orders must use the same maker',
  )
  assertAddressEqual(
    first.receiver,
    second.receiver,
    'AMM orders must use the same receiver',
  )
  assertAddressEqual(
    first.makerAsset,
    second.takerAsset,
    'AMM order assets are not reciprocal',
  )
  assertAddressEqual(
    first.takerAsset,
    second.makerAsset,
    'AMM order assets are not reciprocal',
  )
  assert(
    first.makingAmount === second.takingAmount &&
      first.takingAmount === second.makingAmount,
    'AMM order amounts are not reciprocal',
  )
  assert(
    first.makerTraits === second.makerTraits,
    'AMM orders must use the same maker traits',
  )
  assert(
    first.extension.toLowerCase() === second.extension.toLowerCase(),
    'AMM orders must use the same extension',
  )
}

function assertOrdersEqual(
  first: PoolOrder,
  second: PoolOrder,
  message: string,
): void {
  const equal =
    first.salt === second.salt &&
    isAddressEqual(first.maker, second.maker) &&
    isAddressEqual(first.receiver, second.receiver) &&
    isAddressEqual(first.makerAsset, second.makerAsset) &&
    isAddressEqual(first.takerAsset, second.takerAsset) &&
    first.makingAmount === second.makingAmount &&
    first.takingAmount === second.takingAmount &&
    first.makerTraits === second.makerTraits &&
    first.extension.toLowerCase() === second.extension.toLowerCase()
  assert(equal, message)
}

function buildExpectedOffsets(makerReceivesFee: boolean): string {
  const lengths = [0n, 0n, 20n, 20n, 0n, 0n, 20n, makerReceivesFee ? 20n : 40n]
  let offset = 0n
  let offsets = 0n
  for (const [index, length] of lengths.entries()) {
    offset += length
    offsets |= offset << BigInt(32 * index)
  }
  return offsets.toString(16).padStart(64, '0')
}

function validateAddress(value: Address, name: string): void {
  assert(isAddress(value), `${name} is not a valid address`)
}

function validateUint256(value: bigint, name: string): void {
  assert(
    typeof value === 'bigint' && value >= 0n && value <= UINT256_MAX,
    `${name} must be a uint256 bigint`,
  )
}

function validateEncodedAmount(value: bigint, name: string): void {
  validateUint256(value, name)
  assert(value < UINT256_MAX, `${name} does not encode a positive amount`)
}

function assertFlag(
  value: bigint,
  bit: bigint,
  expected: boolean,
  message: string,
): void {
  assert(((value >> bit) & 1n) === (expected ? 1n : 0n), message)
}

function assertAddressEqual(
  first: Address,
  second: Address,
  message: string,
): void {
  assert(
    isAddress(first) && isAddress(second) && isAddressEqual(first, second),
    message,
  )
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new LopSwapValidationError(message)
}
