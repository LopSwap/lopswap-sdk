import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Hex } from 'viem'
import { LopSwapApi } from '../src/api.js'
import { LopSwapHttpError } from '../src/index.js'
import { defaultContracts } from '../src/config.js'
import {
  PoolStatus,
  PoolType,
  type GetPoolsParams,
  type SignedPool,
} from '../src/types.js'

const maker = '0x1111111111111111111111111111111111111111'
const tokenA = '0x2222222222222222222222222222222222222222'
const tokenB = '0x3333333333333333333333333333333333333333'
const providerFeeReceiver = '0x4444444444444444444444444444444444444444'
const receiver = defaultContracts[137]!.ammPool
const poolId = `0x${'ab'.repeat(32)}` as Hex

const signedPool: SignedPool = {
  chainId: 137,
  type: PoolType.FLASHLOAN,
  orders: [
    {
      salt: 1n,
      maker,
      receiver,
      makerAsset: tokenA,
      takerAsset: tokenB,
      makingAmount: 2n,
      takingAmount: 3n,
      makerTraits: 4n,
      extension: '0x01',
    },
  ],
  typedData: [],
  signatures: ['0x02'],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LopSwapApi configuration and writes', () => {
  it('requires an API URL and a fetch implementation', () => {
    expect(() => new LopSwapApi('', fetch)).toThrow('apiUrl is required')

    vi.stubGlobal('fetch', undefined)
    expect(() => new LopSwapApi('https://api.example.test')).toThrow(
      'A fetch implementation is required',
    )
  })

  it('submits serialized orders and normalizes the create response', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ chainId: 137, poolId, type: PoolType.FLASHLOAN }, 201),
    )
    const api = new LopSwapApi('https://api.example.test/', fetchMock)

    await expect(api.submitPool(signedPool)).resolves.toEqual({
      chainId: 137,
      poolId,
      type: PoolType.FLASHLOAN,
    })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://api.example.test/v1/pools/create')
    expect(init?.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(init?.body))).toEqual({
      chainId: 137,
      type: PoolType.FLASHLOAN,
      orders: [
        {
          order: {
            salt: '1',
            maker,
            receiver,
            makerAsset: tokenA,
            takerAsset: tokenB,
            makingAmount: '2',
            takingAmount: '3',
            makerTraits: '4',
            extension: '0x01',
          },
          signature: '0x02',
        },
      ],
    })
  })

  it('rejects unsupported request and response pool types', async () => {
    const api = apiReturning({
      chainId: 137,
      poolId,
      type: 'UNKNOWN',
    })

    await expect(api.submitPool(signedPool)).rejects.toThrow(
      'LopSwap API returned an unsupported pool type',
    )
    await expect(
      api.submitPool({ ...signedPool, type: 'UNKNOWN' as never }),
    ).rejects.toThrow('Unsupported pool type')
  })

  it('rejects an invalid pool id returned after creation', async () => {
    const api = apiReturning({
      chainId: 137,
      poolId: '0x01',
      type: PoolType.FLASHLOAN,
    })

    await expect(api.submitPool(signedPool)).rejects.toThrow(
      'LopSwap API returned an invalid poolId',
    )
  })
})

describe('LopSwapApi reads', () => {
  it('lists pools with every supported filter and normalizes values', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        pools: [poolResponse()],
        nextCursor: 'next',
      }),
    )
    const api = new LopSwapApi('https://api.example.test', fetchMock)

    const result = await api.getPools(137, {
      type: PoolType.AMM,
      maker,
      tokens: [tokenA, tokenB],
      minBalances: { A: 10n, B: 20n },
      minAvailableBalances: { A: 5n },
      cursor: 'cursor',
      limit: 25,
    })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(url.searchParams.get('maker')).toBe(maker)
    expect(url.searchParams.get('tokens')).toBe(`${tokenA},${tokenB}`)
    expect(url.searchParams.get('minBalances')).toBe('A:10,B:20')
    expect(url.searchParams.get('minAvailableBalances')).toBe('A:5')
    expect(url.searchParams.get('cursor')).toBe('cursor')
    expect(url.searchParams.get('limit')).toBe('25')
    expect(result.nextCursor).toBe('next')
    expect(result.pools[0]?.assets).toEqual([
      { token: tokenA, balance: 100n, availableBalance: 90n },
      { token: tokenB, balance: null, availableBalance: null },
    ])
    expect(result.pools[0]).toMatchObject({
      providerFee: 100,
      providerFeeReceiver,
    })
    expect(result.pools[0]?.orders[0]?.salt).toBe(1n)
  })

  it('supports minimal pool queries and empty balance filters', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ pools: [], nextCursor: null }),
    )
    const api = new LopSwapApi('https://api.example.test', fetchMock)

    await api.getPools(137, { type: PoolType.FLASHLOAN })
    await api.getPools(137, {
      type: PoolType.AMM,
      tokens: [tokenA],
      minBalances: {},
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('tokens=')
    expect(String(fetchMock.mock.calls[1]?.[0])).not.toContain('minBalances=')
  })

  it('gets pool details for active and inactive pools', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(poolResponse()))
      .mockResolvedValueOnce(
        jsonResponse(
          poolResponse({ status: PoolStatus.INACTIVE, expired: true }),
        ),
      )
    const api = new LopSwapApi('https://api.example.test', fetchMock)

    await expect(api.getPool(137, poolId)).resolves.toMatchObject({
      status: PoolStatus.ACTIVE,
      expired: false,
    })
    await expect(api.getPool(137, poolId)).resolves.toMatchObject({
      status: PoolStatus.INACTIVE,
      expired: true,
    })
  })

  it('gets pool types, chains, and token metadata', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input))
      if (url.pathname === '/v1/pools/types') {
        return jsonResponse([{ type: PoolType.AMM, poolCount: 2 }])
      }
      if (url.pathname === '/v1/chains/list') {
        return jsonResponse([{ chainId: 137, name: 'Polygon' }])
      }
      if (url.pathname === `/v1/token/137/${tokenA}`) {
        return jsonResponse(tokenResponse())
      }
      return jsonResponse({
        tokens: [tokenResponse()],
        total: 1,
        hasNextPage: false,
        offset: Number(url.searchParams.get('offset') ?? 0),
        limit: Number(url.searchParams.get('limit') ?? 100),
      })
    })
    const api = new LopSwapApi('https://api.example.test', fetchMock)

    await expect(api.getPoolTypes(137)).resolves.toEqual([
      { type: PoolType.AMM, poolCount: 2 },
    ])
    await expect(api.getChains()).resolves.toEqual([
      { chainId: 137, name: 'Polygon' },
    ])
    await expect(api.getTokens(137)).resolves.toMatchObject({
      tokens: [{ address: tokenA }],
      offset: 0,
      limit: 100,
    })
    await expect(
      api.getTokens(137, { offset: 10, limit: 20 }),
    ).resolves.toMatchObject({ offset: 10, limit: 20 })
    await expect(api.getToken(137, tokenA)).resolves.toEqual(tokenResponse())
  })
})

describe('LopSwapApi validation and errors', () => {
  it.each([
    ['unsupported type', { type: 'UNKNOWN' }],
    ['no tokens', { type: PoolType.AMM, tokens: [] }],
    [
      'too many tokens',
      { type: PoolType.AMM, tokens: [tokenA, tokenB, maker] },
    ],
    ['fractional limit', { type: PoolType.AMM, limit: 1.5 }],
    ['small limit', { type: PoolType.AMM, limit: 0 }],
    ['large limit', { type: PoolType.AMM, limit: 101 }],
    ['filters without tokens', { type: PoolType.AMM, minBalances: { A: 1n } }],
    [
      'filter B without token B',
      { type: PoolType.AMM, tokens: [tokenA], minBalances: { B: 1n } },
    ],
    [
      'negative cached balance',
      { type: PoolType.AMM, tokens: [tokenA], minBalances: { A: -1n } },
    ],
    [
      'negative available balance',
      {
        type: PoolType.AMM,
        tokens: [tokenA, tokenB],
        minAvailableBalances: { B: -1n },
      },
    ],
  ])('rejects invalid pool filters: %s', async (_name, params) => {
    const fetchMock = vi.fn<typeof fetch>()
    const api = new LopSwapApi('https://api.example.test', fetchMock)

    await expect(api.getPools(137, params as GetPoolsParams)).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [{ offset: -1 }, 'offset'],
    [{ offset: 1.5 }, 'offset'],
    [{ offset: Number.MAX_SAFE_INTEGER + 1 }, 'offset'],
    [{ limit: 0 }, 'limit'],
    [{ limit: 1.5 }, 'limit'],
    [{ limit: 101 }, 'limit'],
  ])('rejects invalid token pagination %#', async (params, field) => {
    const api = new LopSwapApi(
      'https://api.example.test',
      vi.fn<typeof fetch>(),
    )

    await expect(api.getTokens(137, params)).rejects.toThrow(field)
  })

  it.each([123, 'not-hex', '0x01'])(
    'rejects invalid pool id %s',
    async (id) => {
      const api = apiReturning(poolResponse())
      await expect(api.getPool(137, id as Hex)).rejects.toThrow(
        'poolId must be a bytes32 hex value',
      )
    },
  )

  it('rejects invalid pool records returned by the API', async () => {
    await expect(
      apiReturning({
        pools: [poolResponse({ poolId: '0x01' })],
        nextCursor: null,
      }).getPools(137, { type: PoolType.AMM }),
    ).rejects.toThrow('LopSwap API returned an invalid poolId')

    await expect(
      apiReturning({
        pools: [poolResponse({ type: 'UNKNOWN' })],
        nextCursor: null,
      }).getPools(137, { type: PoolType.AMM }),
    ).rejects.toThrow('LopSwap API returned an unsupported pool type')
  })

  it.each(['100', 1.5, -1, 65_536])(
    'rejects invalid provider fee %s returned by the API',
    async (providerFee) => {
      await expect(
        apiReturning({
          pools: [poolResponse({ providerFee })],
          nextCursor: null,
        }).getPools(137, { type: PoolType.AMM }),
      ).rejects.toThrow('LopSwap API returned an invalid providerFee')
    },
  )

  it('rejects an invalid provider fee receiver returned by the API', async () => {
    await expect(
      apiReturning({
        pools: [poolResponse({ providerFeeReceiver: 'not-an-address' })],
        nextCursor: null,
      }).getPools(137, { type: PoolType.AMM }),
    ).rejects.toThrow()
  })

  it('rejects invalid pool statuses and order hex fields', async () => {
    await expect(
      apiReturning(poolResponse({ status: 'UNKNOWN' })).getPool(137, poolId),
    ).rejects.toThrow('LopSwap API returned an unsupported pool status')

    await expect(
      apiReturning({
        pools: [poolResponse({ signature: 'not-hex' })],
        nextCursor: null,
      }).getPools(137, { type: PoolType.AMM }),
    ).rejects.toThrow('LopSwap API returned an invalid order')

    await expect(
      apiReturning({
        pools: [poolResponse({ extension: 'not-hex' })],
        nextCursor: null,
      }).getPools(137, { type: PoolType.AMM }),
    ).rejects.toThrow('LopSwap API returned an invalid order')
  })

  it('exposes structured JSON, text, and empty HTTP errors', async () => {
    const jsonBody = { code: 'INVALID_REQUEST', message: 'invalid request' }
    const withJson = new LopSwapApi(
      'https://api.example.test',
      vi.fn<typeof fetch>(async () => jsonResponse(jsonBody, 400)),
    )
    const withText = new LopSwapApi(
      'https://api.example.test',
      vi.fn<typeof fetch>(
        async () => new Response('upstream failure', { status: 502 }),
      ),
    )
    const withoutBody = new LopSwapApi(
      'https://api.example.test',
      vi.fn<typeof fetch>(
        async () =>
          new Response(null, { status: 503, statusText: 'Unavailable' }),
      ),
    )

    const error = await withJson.getChains().catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(LopSwapHttpError)
    expect(error).toMatchObject({
      name: 'LopSwapHttpError',
      status: 400,
      body: jsonBody,
      endpoint: 'https://api.example.test/v1/chains/list',
    })
    expect(error).toHaveProperty(
      'message',
      `LopSwap API request failed (400): ${JSON.stringify(jsonBody)}`,
    )
    await expect(withText.getChains()).rejects.toMatchObject({
      status: 502,
      body: 'upstream failure',
      endpoint: 'https://api.example.test/v1/chains/list',
    })
    await expect(withText.getChains()).rejects.toThrow(
      'LopSwap API request failed (502): upstream failure',
    )
    await expect(withoutBody.getChains()).rejects.toMatchObject({
      status: 503,
      body: null,
      endpoint: 'https://api.example.test/v1/chains/list',
      message: 'LopSwap API request failed (503): Unavailable',
    })
  })
})

function apiReturning(value: unknown): LopSwapApi {
  return new LopSwapApi(
    'https://api.example.test',
    vi.fn<typeof fetch>(async () => jsonResponse(value)),
  )
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function tokenResponse() {
  return {
    chainId: 137,
    address: tokenA,
    symbol: 'TKA',
    name: 'Token A',
    decimals: 18,
    logo: 'https://example.test/token.svg',
  }
}

function poolResponse(
  overrides: {
    poolId?: string
    type?: string
    providerFee?: unknown
    providerFeeReceiver?: string
    status?: string
    expired?: boolean
    signature?: string
    extension?: string
  } = {},
) {
  return {
    poolId: overrides.poolId ?? poolId,
    chainId: 137,
    type: overrides.type ?? PoolType.AMM,
    maker,
    providerFee: overrides.providerFee ?? 100,
    providerFeeReceiver: overrides.providerFeeReceiver ?? providerFeeReceiver,
    expiresAt: '2100-01-01T00:00:00.000Z',
    assets: [
      { token: tokenA, balance: '100', availableBalance: '90' },
      { token: tokenB, balance: null, availableBalance: null },
    ],
    orders: [
      {
        salt: '1',
        maker,
        receiver,
        makerAsset: tokenA,
        takerAsset: tokenB,
        makingAmount: '2',
        takingAmount: '3',
        makerTraits: '4',
        signature: overrides.signature ?? '0x01',
        extension: overrides.extension ?? '0x02',
      },
    ],
    status: overrides.status ?? PoolStatus.ACTIVE,
    expired: overrides.expired ?? false,
  }
}
