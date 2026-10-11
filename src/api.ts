import { getAddress, isHex, size, type Address, type Hex } from 'viem'
import { LopSwapHttpError } from './errors.js'
import type {
  ChainInfo,
  CreatePoolResult,
  GetPoolsParams,
  GetTokensParams,
  Pool,
  PoolAsset,
  PoolDetails,
  PoolListResult,
  PoolOrder,
  PoolTypeInfo,
  SignedOrder,
  SignedPool,
  Token,
  TokenListResult,
} from './types.js'
import { PoolStatus, PoolType } from './types.js'

export class LopSwapApi {
  readonly #baseUrl: string
  readonly #fetch: typeof globalThis.fetch

  constructor(baseUrl: string, fetchImplementation = globalThis.fetch) {
    if (!baseUrl) throw new Error('apiUrl is required')
    if (!fetchImplementation)
      throw new Error('A fetch implementation is required')

    this.#baseUrl = baseUrl.replace(/\/$/, '')
    this.#fetch = fetchImplementation
  }

  async submitPool(pool: SignedPool): Promise<CreatePoolResult> {
    assertPoolType(pool.type)

    const response = await this.#request<CreatePoolResponse>(
      '/v1/pools/create',
      {
        method: 'POST',
        body: JSON.stringify({
          chainId: pool.chainId,
          type: pool.type,
          orders: pool.orders.map((order, index) => ({
            order: serializeOrder(order),
            signature: pool.signatures[index],
          })),
        }),
      },
    )
    return normalizeCreatePoolResult(response)
  }

  async getPools(
    chainId: number,
    params: GetPoolsParams,
  ): Promise<PoolListResult> {
    validateGetPoolsParams(params)
    const query = new URLSearchParams({
      chainId: chainId.toString(),
      type: params.type,
    })
    if (params.maker) query.set('maker', getAddress(params.maker))
    if (params.tokens) {
      query.set(
        'tokens',
        params.tokens.map((address) => getAddress(address)).join(','),
      )
    }
    setBalanceFilters(query, 'minBalances', params.minBalances)
    setBalanceFilters(
      query,
      'minAvailableBalances',
      params.minAvailableBalances,
    )
    if (params.cursor) query.set('cursor', params.cursor)
    if (params.limit !== undefined) query.set('limit', params.limit.toString())

    const response = await this.#request<PoolListResponse>(
      `/v1/pools/list?${query.toString()}`,
    )
    return {
      pools: response.pools.map(normalizePool),
      nextCursor: response.nextCursor,
    }
  }

  async getPool(chainId: number, poolId: Hex): Promise<PoolDetails> {
    assertPoolId(poolId)
    const response = await this.#request<PoolDetailsResponse>(
      `/v1/pools/details/${chainId}/${encodeURIComponent(poolId)}`,
    )
    return normalizePoolDetails(response)
  }

  getPoolTypes(chainId: number): Promise<PoolTypeInfo[]> {
    return this.#request(`/v1/pools/types?chainId=${chainId}`)
  }

  getChains(): Promise<ChainInfo[]> {
    return this.#request('/v1/chains/list')
  }

  async getTokens(
    chainId: number,
    params: GetTokensParams = {},
  ): Promise<TokenListResult> {
    validateGetTokensParams(params)
    const query = new URLSearchParams()
    if (params.offset !== undefined)
      query.set('offset', params.offset.toString())
    if (params.limit !== undefined) query.set('limit', params.limit.toString())
    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    const response = await this.#request<TokenListResponse>(
      `/v1/token/${chainId}${suffix}`,
    )
    return {
      ...response,
      tokens: response.tokens.map(normalizeToken),
    }
  }

  async getToken(chainId: number, address: Address): Promise<Token> {
    const response = await this.#request<TokenResponse>(
      `/v1/token/${chainId}/${getAddress(address)}`,
    )
    return normalizeToken(response)
  }

  async #request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const endpoint = `${this.#baseUrl}${path}`
    const response = await this.#fetch(endpoint, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })

    if (!response.ok) {
      const responseText = await response.text()
      throw new LopSwapHttpError(
        response.status,
        parseErrorBody(responseText),
        endpoint,
        responseText || response.statusText,
      )
    }

    return (await response.json()) as T
  }
}

function parseErrorBody(responseText: string): unknown {
  if (!responseText) return null

  try {
    return JSON.parse(responseText) as unknown
  } catch {
    return responseText
  }
}

interface SignedOrderResponse {
  salt: string
  maker: string
  receiver: string
  makerAsset: string
  takerAsset: string
  makingAmount: string
  takingAmount: string
  makerTraits: string
  signature: string
  extension: string
}

interface PoolAssetResponse {
  token: string
  balance: string | null
  availableBalance: string | null
}

interface PoolResponse {
  poolId: string
  chainId: number
  type: PoolType
  maker: string
  providerFee: number
  providerFeeReceiver: string
  expiresAt: string
  assets: PoolAssetResponse[]
  orders: SignedOrderResponse[]
}

interface PoolDetailsResponse extends PoolResponse {
  status: PoolDetails['status']
  expired: boolean
}

interface PoolListResponse {
  pools: PoolResponse[]
  nextCursor: string | null
}

interface CreatePoolResponse {
  chainId: number
  poolId: string
  type: PoolType
}

interface TokenResponse {
  chainId: number
  address: string
  symbol: string
  name: string
  decimals: number
  logo: string
}

interface TokenListResponse {
  tokens: TokenResponse[]
  total: number
  hasNextPage: boolean
  offset: number
  limit: number
}

function normalizePool(pool: PoolResponse): Pool {
  assertPoolId(pool.poolId, 'LopSwap API returned an invalid poolId')
  assertPoolType(pool.type, 'LopSwap API returned an unsupported pool type')
  assertProviderFee(pool.providerFee)

  return {
    poolId: pool.poolId,
    chainId: pool.chainId,
    type: pool.type,
    maker: getAddress(pool.maker),
    providerFee: pool.providerFee,
    providerFeeReceiver: getAddress(pool.providerFeeReceiver),
    expiresAt: pool.expiresAt,
    assets: pool.assets.map(normalizePoolAsset),
    orders: pool.orders.map(normalizeOrder),
  }
}

function normalizeCreatePoolResult(
  result: CreatePoolResponse,
): CreatePoolResult {
  assertPoolId(result.poolId, 'LopSwap API returned an invalid poolId')
  assertPoolType(result.type, 'LopSwap API returned an unsupported pool type')
  return {
    chainId: result.chainId,
    poolId: result.poolId,
    type: result.type,
  }
}

function normalizePoolDetails(pool: PoolDetailsResponse): PoolDetails {
  if (
    pool.status !== PoolStatus.ACTIVE &&
    pool.status !== PoolStatus.INACTIVE
  ) {
    throw new Error('LopSwap API returned an unsupported pool status')
  }
  return {
    ...normalizePool(pool),
    status: pool.status,
    expired: pool.expired,
  }
}

function normalizePoolAsset(asset: PoolAssetResponse): PoolAsset {
  return {
    token: getAddress(asset.token),
    balance: asset.balance === null ? null : BigInt(asset.balance),
    availableBalance:
      asset.availableBalance === null ? null : BigInt(asset.availableBalance),
  }
}

function normalizeOrder(order: SignedOrderResponse): SignedOrder {
  if (!isHex(order.signature) || !isHex(order.extension)) {
    throw new Error('LopSwap API returned an invalid order')
  }
  return {
    salt: BigInt(order.salt),
    maker: getAddress(order.maker),
    receiver: getAddress(order.receiver),
    makerAsset: getAddress(order.makerAsset),
    takerAsset: getAddress(order.takerAsset),
    makingAmount: BigInt(order.makingAmount),
    takingAmount: BigInt(order.takingAmount),
    makerTraits: BigInt(order.makerTraits),
    signature: order.signature,
    extension: order.extension,
  }
}

function normalizeToken(token: TokenResponse): Token {
  return {
    ...token,
    address: getAddress(token.address),
  }
}

function serializeOrder(order: PoolOrder): Record<string, string> {
  return {
    salt: order.salt.toString(),
    maker: order.maker,
    receiver: order.receiver,
    makerAsset: order.makerAsset,
    takerAsset: order.takerAsset,
    makingAmount: order.makingAmount.toString(),
    takingAmount: order.takingAmount.toString(),
    makerTraits: order.makerTraits.toString(),
    extension: order.extension,
  }
}

function setBalanceFilters(
  query: URLSearchParams,
  name: string,
  filters: GetPoolsParams['minBalances'],
): void {
  if (!filters) return
  const values = [
    filters.A === undefined ? undefined : `A:${filters.A}`,
    filters.B === undefined ? undefined : `B:${filters.B}`,
  ].filter((value): value is string => value !== undefined)
  if (values.length > 0) query.set(name, values.join(','))
}

function validateGetPoolsParams(params: GetPoolsParams): void {
  assertPoolType(params.type)
  if (
    params.tokens &&
    params.tokens.length !== 1 &&
    params.tokens.length !== 2
  ) {
    throw new Error('tokens must contain one or two addresses')
  }
  if (params.limit !== undefined) {
    assertIntegerInRange(params.limit, 1, 100, 'limit')
  }

  const hasBalanceFilters =
    params.minBalances !== undefined ||
    params.minAvailableBalances !== undefined
  if (hasBalanceFilters && !params.tokens) {
    throw new Error('tokens is required when using balance filters')
  }

  for (const filters of [params.minBalances, params.minAvailableBalances]) {
    if (!filters) continue
    if (filters.B !== undefined && params.tokens?.length !== 2) {
      throw new Error('A second token is required for balance filter B')
    }
    for (const value of [filters.A, filters.B]) {
      if (value !== undefined && value < 0n) {
        throw new Error('Balance filters cannot be negative')
      }
    }
  }
}

function validateGetTokensParams(params: GetTokensParams): void {
  if (params.offset !== undefined) {
    assertIntegerInRange(params.offset, 0, Number.MAX_SAFE_INTEGER, 'offset')
  }
  if (params.limit !== undefined) {
    assertIntegerInRange(params.limit, 1, 100, 'limit')
  }
}

function assertIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  name: string,
): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`)
  }
}

function assertPoolType(
  type: unknown,
  message = 'Unsupported pool type',
): asserts type is PoolType {
  if (type !== PoolType.AMM && type !== PoolType.FLASHLOAN) {
    throw new Error(message)
  }
}

function assertPoolId(
  poolId: unknown,
  message = 'poolId must be a bytes32 hex value',
): asserts poolId is Hex {
  if (typeof poolId !== 'string' || !isHex(poolId) || size(poolId) !== 32) {
    throw new Error(message)
  }
}

function assertProviderFee(value: unknown): asserts value is number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 65_535
  ) {
    throw new Error('LopSwap API returned an invalid providerFee')
  }
}
