import {
  getAddress,
  hexToBytes,
  isAddressEqual,
  keccak256,
  type Address,
  type Hex,
} from 'viem'
import {
  MAX_UINT256,
  ORDER_DOMAIN_NAME,
  ORDER_DOMAIN_VERSION,
} from './config.js'
import type {
  OrderTypedData,
  PoolOrder,
  PreparePoolParams,
  PreparedPool,
} from './types.js'
import { PoolType } from './types.js'
import type { LopSwapContracts } from './config.js'

const HAS_EXTENSION_FLAG = 249n
const NEED_PRE_INTERACTION_FLAG = 252n
const NEED_POST_INTERACTION_FLAG = 251n
const ALLOW_MULTIPLE_FILLS_FLAG = 254n
const MAX_PROVIDER_FEE = (1n << 16n) - 1n
const MAX_POOL_NONCE = (1n << 72n) - 1n
const MAX_EXPIRATION = (1n << 40n) - 1n
const ZERO_HEX = '0x' as const

export const ORDER_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'receiver', type: 'address' },
    { name: 'makerAsset', type: 'address' },
    { name: 'takerAsset', type: 'address' },
    { name: 'makingAmount', type: 'uint256' },
    { name: 'takingAmount', type: 'uint256' },
    { name: 'makerTraits', type: 'uint256' },
  ],
} as const

export function preparePool(
  params: PreparePoolParams,
  chainId: number,
  contracts: LopSwapContracts,
): PreparedPool {
  validateBaseParams(params)

  const poolNonce = params.poolNonce ?? randomPoolNonce()
  if (poolNonce < 0n || poolNonce > MAX_POOL_NONCE) {
    throw new RangeError('poolNonce must fit in 72 bits')
  }

  const maker = getAddress(params.maker)
  const feeReceiver = getAddress(params.providerFeeReceiver ?? maker)
  const receiver =
    params.type === PoolType.AMM ? contracts.ammPool : contracts.flashLoanPool
  const extension = buildExtension(receiver, feeReceiver, maker)
  const makerTraits = buildMakerTraits(params.expiration)

  const orders =
    params.type === PoolType.AMM
      ? prepareAmmOrders(params, maker, receiver, extension, makerTraits)
      : prepareFlashLoanOrder(
          params,
          maker,
          receiver,
          contracts.erc20True,
          extension,
          makerTraits,
        )

  const ordersWithSalt = orders.map((order) => ({
    ...order,
    salt: buildSalt(
      extension,
      params.providerFee,
      poolNonce,
      isAddressEqual(feeReceiver, maker),
    ),
  }))

  return {
    type: params.type,
    chainId,
    orders: ordersWithSalt,
    typedData: ordersWithSalt.map((order) =>
      buildOrderTypedData(order, chainId, contracts.limitOrderProtocol),
    ),
  }
}

function prepareAmmOrders(
  params: Extract<PreparePoolParams, { type: typeof PoolType.AMM }>,
  maker: Address,
  receiver: Address,
  extension: Hex,
  makerTraits: bigint,
): PoolOrder[] {
  const tokenA = getAddress(params.tokenA)
  const tokenB = getAddress(params.tokenB)
  if (isAddressEqual(tokenA, tokenB)) {
    throw new Error('AMM pool tokens must be different')
  }
  validateAmount(params.amountA, 'amountA')
  validateAmount(params.amountB, 'amountB')

  const aComesFirst = BigInt(tokenA) < BigInt(tokenB)
  const firstAsset = aComesFirst ? tokenA : tokenB
  const secondAsset = aComesFirst ? tokenB : tokenA
  const firstAmount = aComesFirst ? params.amountA : params.amountB
  const secondAmount = aComesFirst ? params.amountB : params.amountA

  const firstEncodedAmount = encodeLiquidityAmount(firstAmount)
  const secondEncodedAmount = encodeLiquidityAmount(secondAmount)

  return [
    createOrder(
      maker,
      receiver,
      secondAsset,
      firstAsset,
      secondEncodedAmount,
      firstEncodedAmount,
      makerTraits,
      extension,
    ),
    createOrder(
      maker,
      receiver,
      firstAsset,
      secondAsset,
      firstEncodedAmount,
      secondEncodedAmount,
      makerTraits,
      extension,
    ),
  ]
}

function prepareFlashLoanOrder(
  params: Extract<PreparePoolParams, { type: typeof PoolType.FLASHLOAN }>,
  maker: Address,
  receiver: Address,
  erc20True: Address,
  extension: Hex,
  makerTraits: bigint,
): PoolOrder[] {
  validateAmount(params.amount, 'amount')

  return [
    createOrder(
      maker,
      receiver,
      getAddress(params.token),
      erc20True,
      encodeLiquidityAmount(params.amount),
      encodeLiquidityAmount(1n),
      makerTraits,
      extension,
    ),
  ]
}

function createOrder(
  maker: Address,
  receiver: Address,
  makerAsset: Address,
  takerAsset: Address,
  makingAmount: bigint,
  takingAmount: bigint,
  makerTraits: bigint,
  extension: Hex,
): PoolOrder {
  return {
    salt: 0n,
    maker,
    receiver,
    makerAsset,
    takerAsset,
    makingAmount,
    takingAmount,
    makerTraits:
      makerTraits |
      (1n << HAS_EXTENSION_FLAG) |
      (1n << NEED_PRE_INTERACTION_FLAG) |
      (1n << NEED_POST_INTERACTION_FLAG),
    extension,
  }
}

function buildMakerTraits(expiration: bigint): bigint {
  return (expiration << 80n) | (1n << ALLOW_MULTIPLE_FILLS_FLAG)
}

function buildExtension(
  receiver: Address,
  feeReceiver: Address,
  maker: Address,
): Hex {
  const postInteraction = isAddressEqual(feeReceiver, maker)
    ? receiver
    : (`${receiver}${feeReceiver.slice(2)}` as Hex)
  const interactions = [
    ZERO_HEX,
    ZERO_HEX,
    receiver,
    receiver,
    ZERO_HEX,
    ZERO_HEX,
    receiver,
    postInteraction,
  ] as const

  let offset = 0n
  let offsets = 0n
  for (const [index, interaction] of interactions.entries()) {
    offset += BigInt((interaction.length - 2) / 2)
    offsets |= offset << BigInt(32 * index)
  }

  const body = interactions.map((value) => value.slice(2)).join('')
  return `0x${offsets.toString(16).padStart(64, '0')}${body}` as Hex
}

function buildSalt(
  extension: Hex,
  providerFee: bigint,
  poolNonce: bigint,
  makerReceivesFee: boolean,
): bigint {
  const extensionHash =
    BigInt(keccak256(hexToBytes(extension))) & ((1n << 160n) - 1n)
  const bitmap = makerReceivesFee ? 1n << 7n : 0n

  return (
    (bitmap << 248n) |
    (providerFee << 232n) |
    (poolNonce << 160n) |
    extensionHash
  )
}

export function buildOrderTypedData(
  order: PoolOrder,
  chainId: number,
  limitOrderProtocol: Address,
): OrderTypedData {
  return {
    domain: {
      name: ORDER_DOMAIN_NAME,
      version: ORDER_DOMAIN_VERSION,
      chainId,
      verifyingContract: limitOrderProtocol,
    },
    types: ORDER_TYPES,
    primaryType: 'Order',
    message: order,
  }
}

function encodeLiquidityAmount(amount: bigint): bigint {
  return MAX_UINT256 - amount
}

function validateBaseParams(params: PreparePoolParams): void {
  if (params.type !== PoolType.AMM && params.type !== PoolType.FLASHLOAN) {
    throw new Error('Unsupported pool type')
  }
  if (params.providerFee < 0n || params.providerFee > MAX_PROVIDER_FEE) {
    throw new RangeError('providerFee must fit in 16 bits')
  }
  if (params.expiration <= BigInt(Math.floor(Date.now() / 1_000))) {
    throw new RangeError('expiration must be in the future')
  }
  if (params.expiration > MAX_EXPIRATION) {
    throw new RangeError('expiration must fit in 40 bits')
  }
}

function validateAmount(amount: bigint, name: string): void {
  if (amount <= 0n || amount >= MAX_UINT256) {
    throw new RangeError(
      `${name} must be greater than zero and less than uint256 max`,
    )
  }
}

function randomPoolNonce(): bigint {
  const bytes = new Uint8Array(9)
  globalThis.crypto.getRandomValues(bytes)
  return bytes.reduce((value, byte) => (value << 8n) | BigInt(byte), 0n)
}
