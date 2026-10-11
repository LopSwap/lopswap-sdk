import { afterEach, describe, expect, it, vi } from 'vitest'
import { privateKeyToAccount } from 'viem/accounts'
import { LopSwap, MAX_UINT256, PoolType } from '../src/index.js'
import { defaultContracts } from '../src/config.js'

const account = privateKeyToAccount(
  '0x0000000000000000000000000000000000000000000000000000000000000001',
)
const maker = account.address
const tokenA = '0x2222222222222222222222222222222222222222'
const tokenB = '0x3333333333333333333333333333333333333333'

function createSdk(fetchImplementation?: typeof fetch) {
  if (fetchImplementation) vi.stubGlobal('fetch', fetchImplementation)

  return new LopSwap({
    chainId: 137,
    apiUrl: 'https://api.example.test',
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('preparePool', () => {
  it('prepares reciprocal AMM orders', () => {
    const pool = createSdk().preparePool({
      type: PoolType.AMM,
      maker,
      tokenA,
      tokenB,
      amountA: 100n,
      amountB: 200n,
      providerFee: 1_000n,
      expiration: 4_102_444_800n,
      poolNonce: 42n,
    })

    expect(pool.orders).toHaveLength(2)
    expect(pool.orders[0]?.makerAsset).toBe(tokenB)
    expect(pool.orders[1]?.makerAsset).toBe(tokenA)
    expect(pool.orders[0]?.makingAmount).toBe(MAX_UINT256 - 200n)
    expect(pool.orders[1]?.makingAmount).toBe(MAX_UINT256 - 100n)
    expect(pool.orders[0]?.salt).toBe(pool.orders[1]?.salt)
    expect(pool.typedData[0]?.domain.chainId).toBe(137)
    expect(pool.orders[0]?.receiver).toBe(defaultContracts[137]?.ammPool)
  })

  it('prepares one flash-loan order', () => {
    const pool = createSdk().preparePool({
      type: PoolType.FLASHLOAN,
      maker,
      token: tokenA,
      amount: 500n,
      providerFee: 500n,
      expiration: 4_102_444_800n,
      poolNonce: 7n,
    })

    expect(pool.orders).toHaveLength(1)
    expect(pool.orders[0]?.makerAsset).toBe(tokenA)
    expect(pool.orders[0]?.makingAmount).toBe(MAX_UINT256 - 500n)
    expect(pool.orders[0]?.receiver).toBe(defaultContracts[137]?.flashLoanPool)
  })
})

describe('submitPool', () => {
  it('uses the public create endpoint and serializes bigint values', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = []
    const poolId = `0x${'ab'.repeat(32)}` as const
    const fetchMock: typeof fetch = async (input, init) => {
      calls.push({ url: input.toString(), init })
      return new Response(
        JSON.stringify({ chainId: 137, poolId, type: PoolType.AMM }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
    const sdk = createSdk(fetchMock)
    const prepared = sdk.preparePool({
      type: PoolType.AMM,
      maker,
      tokenA,
      tokenB,
      amountA: 100n,
      amountB: 200n,
      providerFee: 0n,
      expiration: 4_102_444_800n,
      poolNonce: 1n,
    })

    const signatures = await Promise.all(
      prepared.typedData.map((typedData) => account.signTypedData(typedData)),
    )
    const result = await sdk.submitPool({
      ...prepared,
      signatures,
    })

    expect(result).toEqual({ chainId: 137, poolId, type: PoolType.AMM })
    expect(calls[0]?.url).toBe('https://api.example.test/v1/pools/create')
    const body = JSON.parse(String(calls[0]?.init?.body))
    expect(body.type).toBe(PoolType.AMM)
    expect(body.orders).toHaveLength(2)
    expect(body.orders[0].order.salt).toBe(prepared.orders[0]?.salt.toString())
    expect(body.orders[0].signature).toBe(signatures[0])
  })

  it('rejects invalid signatures before calling the backend', async () => {
    let called = false
    const fetchMock: typeof fetch = async () => {
      called = true
      return new Response('{}', { status: 200 })
    }
    const sdk = createSdk(fetchMock)
    const prepared = sdk.preparePool({
      type: PoolType.FLASHLOAN,
      maker,
      token: tokenA,
      amount: 100n,
      providerFee: 0n,
      expiration: 4_102_444_800n,
      poolNonce: 1n,
    })

    await expect(
      sdk.submitPool({ ...prepared, signatures: ['0x01'] }),
    ).rejects.toThrow('Signature 0 does not match the order maker')
    expect(called).toBe(false)
  })
})

describe('getPools', () => {
  it('sends filters and normalizes public API numeric fields', async () => {
    const poolId = `0x${'cd'.repeat(32)}` as const
    let requestUrl = ''
    const fetchMock: typeof fetch = async (input) => {
      requestUrl = input.toString()
      return new Response(
        JSON.stringify({
          pools: [
            {
              poolId,
              chainId: 137,
              type: PoolType.AMM,
              maker,
              providerFee: 100,
              providerFeeReceiver: maker,
              expiresAt: '2100-01-01T00:00:00.000Z',
              assets: [
                {
                  token: tokenA,
                  balance: '100',
                  availableBalance: '90',
                },
                {
                  token: tokenB,
                  balance: null,
                  availableBalance: null,
                },
              ],
              orders: [
                {
                  salt: '1',
                  maker,
                  receiver: defaultContracts[137]?.ammPool,
                  makerAsset: tokenA,
                  takerAsset: tokenB,
                  makingAmount: '100',
                  takingAmount: '200',
                  makerTraits: '3',
                  signature: '0x01',
                  extension: '0x02',
                },
              ],
            },
          ],
          nextCursor: 'next-page',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const page = await createSdk(fetchMock).getPools({
      type: PoolType.AMM,
      maker,
      tokens: [tokenA, tokenB],
      minBalances: { A: 50n, B: 75n },
      limit: 20,
    })

    const url = new URL(requestUrl)
    expect(url.pathname).toBe('/v1/pools/list')
    expect(url.searchParams.get('chainId')).toBe('137')
    expect(url.searchParams.get('type')).toBe(PoolType.AMM)
    expect(url.searchParams.get('tokens')).toBe(`${tokenA},${tokenB}`)
    expect(url.searchParams.get('minBalances')).toBe('A:50,B:75')
    expect(page.nextCursor).toBe('next-page')
    expect(page.pools[0]?.providerFee).toBe(100)
    expect(page.pools[0]?.providerFeeReceiver).toBe(maker)
    expect(page.pools[0]?.assets[0]?.balance).toBe(100n)
    expect(page.pools[0]?.assets[1]?.balance).toBeNull()
    expect(page.pools[0]?.orders[0]?.salt).toBe(1n)
    expect(page.pools[0]?.orders[0]?.makingAmount).toBe(100n)
  })

  it('rejects balance filters without token filters', async () => {
    await expect(
      createSdk().getPools({
        type: PoolType.AMM,
        minBalances: { A: 1n },
      }),
    ).rejects.toThrow('tokens is required when using balance filters')
  })
})
