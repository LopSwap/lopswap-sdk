import { describe, expect, it } from 'vitest'
import { LopSwap, MAX_UINT256, PoolType } from '../src/index.js'
import { defaultContracts } from '../src/config.js'
import { validatePreparedPool } from '../src/validation.js'
import type { PrepareAmmPoolParams } from '../src/types.js'

const maker = '0x1111111111111111111111111111111111111111'
const tokenA = '0x2222222222222222222222222222222222222222'
const tokenB = '0x3333333333333333333333333333333333333333'
const feeReceiver = '0x4444444444444444444444444444444444444444'
const expiration = 4_102_444_800n
const maxPoolNonce = (1n << 72n) - 1n
const maxExpiration = (1n << 40n) - 1n

const baseAmmParams = {
  type: PoolType.AMM,
  maker,
  tokenA,
  tokenB,
  amountA: 100n,
  amountB: 200n,
  providerFee: 1_000n,
  expiration,
  poolNonce: 1n,
} satisfies PrepareAmmPoolParams

describe('pool order edge cases', () => {
  it('generates a 72-bit nonce when one is not supplied', () => {
    const pool = createSdk().preparePool({
      type: PoolType.AMM,
      maker,
      tokenA,
      tokenB,
      amountA: 100n,
      amountB: 200n,
      providerFee: 1_000n,
      expiration,
    })
    const nonce = (pool.orders[0]!.salt >> 160n) & maxPoolNonce

    expect(nonce).toBeGreaterThanOrEqual(0n)
    expect(nonce).toBeLessThanOrEqual(maxPoolNonce)
    expect(pool.orders[0]?.salt).toBe(pool.orders[1]?.salt)
  })

  it('keeps canonical order direction when tokens are supplied in reverse', () => {
    const pool = createSdk().preparePool({
      ...baseAmmParams,
      tokenA: tokenB,
      tokenB: tokenA,
    })

    expect(pool.orders[0]?.makerAsset).toBe(tokenB)
    expect(pool.orders[0]?.takerAsset).toBe(tokenA)
    expect(pool.orders[0]?.makingAmount).toBe(MAX_UINT256 - 100n)
    expect(pool.orders[0]?.takingAmount).toBe(MAX_UINT256 - 200n)
  })

  it('encodes and validates a separate provider fee receiver', () => {
    const sdk = createSdk()
    const pool = sdk.preparePool({
      ...baseAmmParams,
      providerFeeReceiver: feeReceiver,
    })

    validatePreparedPool(pool, 137, defaultContracts[137]!)
    expect(pool.orders[0]?.extension.endsWith(feeReceiver.slice(2))).toBe(true)
    expect((pool.orders[0]!.salt >> 248n) & 0xffn).toBe(0n)
  })

  it.each([
    [-1n, 'poolNonce must fit in 72 bits'],
    [maxPoolNonce + 1n, 'poolNonce must fit in 72 bits'],
  ])('rejects an invalid pool nonce %s', (poolNonce, message) => {
    expect(() =>
      createSdk().preparePool({ ...baseAmmParams, poolNonce }),
    ).toThrow(message)
  })

  it('rejects identical AMM tokens', () => {
    expect(() =>
      createSdk().preparePool({ ...baseAmmParams, tokenB: tokenA }),
    ).toThrow('AMM pool tokens must be different')
  })

  it.each([-1n, 65_536n])('rejects provider fee %s', (providerFee) => {
    expect(() =>
      createSdk().preparePool({ ...baseAmmParams, providerFee }),
    ).toThrow('providerFee must fit in 16 bits')
  })

  it.each([
    [1n, 'expiration must be in the future'],
    [maxExpiration + 1n, 'expiration must fit in 40 bits'],
  ])('rejects expiration %s', (invalidExpiration, message) => {
    expect(() =>
      createSdk().preparePool({
        ...baseAmmParams,
        expiration: invalidExpiration,
      }),
    ).toThrow(message)
  })

  it.each([0n, MAX_UINT256])('rejects AMM amount %s', (amountA) => {
    expect(() =>
      createSdk().preparePool({ ...baseAmmParams, amountA }),
    ).toThrow('amountA must be greater than zero and less than uint256 max')
  })

  it.each([0n, MAX_UINT256])('rejects flash-loan amount %s', (amount) => {
    expect(() =>
      createSdk().preparePool({
        type: PoolType.FLASHLOAN,
        maker,
        token: tokenA,
        amount,
        providerFee: 0n,
        expiration,
        poolNonce: 1n,
      }),
    ).toThrow('amount must be greater than zero and less than uint256 max')
  })

  it('rejects an unsupported pool type at runtime', () => {
    expect(() =>
      createSdk().preparePool({
        ...baseAmmParams,
        type: 'UNKNOWN',
      } as never),
    ).toThrow('Unsupported pool type')
  })
})

function createSdk(): LopSwap {
  return new LopSwap({
    chainId: 137,
    apiUrl: 'https://api.example.test',
  })
}
