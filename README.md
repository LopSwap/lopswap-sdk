<div align="center">
    <img src="https://github.com/LopSwap/lopswap-sdk/blob/master/.github/lopswap_github_logo.png">
</div>

# @lopswap/sdk

[![CI](https://github.com/LopSwap/lopswap-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/LopSwap/lopswap-sdk/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/LopSwap/lopswap-sdk/graph/badge.svg?token=9LBVYUY931)](https://codecov.io/gh/LopSwap/lopswap-sdk)
[![NPM Package](https://img.shields.io/npm/v/@lopswap/sdk.svg)](https://www.npmjs.org/package/@lopswap/sdk)

TypeScript SDK for creating and managing LopSwap pools.

## Install

```bash
npm install @lopswap/sdk viem
```

## API

The production LopSwap API URL is:

```text
https://api.lopswap.io
```

Pass a different `apiUrl` only when using a local or self-hosted backend.
The public API reference is available at https://api.lopswap.io/docs.

Failed HTTP requests throw `LopSwapHttpError`. It exposes the HTTP `status`,
parsed response `body`, and requested `endpoint` for programmatic handling.

## Usage

```ts
import { LopSwap, PoolType } from '@lopswap/sdk'

const sdk = new LopSwap({
  chainId: 137,
  apiUrl: 'https://api.lopswap.io',
  rpcUrl,
})

const result = await sdk.createPool(
  {
    type: PoolType.AMM,
    maker: walletClient.account.address,
    tokenA,
    tokenB,
    amountA: 1_000_000n,
    amountB: 2_000_000n,
    providerFee: 1_000n,
    expiration: BigInt(Math.floor(Date.now() / 1_000) + 86_400),
  },
  walletClient,
)
```

`rpcUrl` is your Polygon JSON-RPC endpoint. `walletClient` is a viem client
used only for signatures and transactions. See the complete
[server example](./examples/createAmmPool.ts) for its setup.

## Backend and onchain balances

`getPools(params)` returns active, non-expired pools with signed orders and cached `balance` and `availableBalance` values for each asset. A cached value may be `null` or lag behind the blockchain. `getPool(poolId)` also returns inactive and expired pools, with their current `status` and `expired` state.

Both methods return the `providerFee` set by the account providing liquidity to the pool, in 1/100,000 units, and the `providerFeeReceiver` address that receives this fee.

`getPoolBalances(order)` reads the current balances directly from the pool contract through RPC. Use it when a current onchain value is required, for example before making a liquidity or execution decision.

## Pool discovery

```ts
const page = await sdk.getPools({
  type: PoolType.AMM,
  maker,
  tokens: [tokenA, tokenB],
  minAvailableBalances: { A: 1_000_000n },
  limit: 20,
})

const pool = await sdk.getPool(page.pools[0].poolId)
```

`tokens` accepts one or two addresses.
`minBalances` and `minAvailableBalances` use base units and require `tokens`.
Pass `page.nextCursor` as `cursor` to load the next page.

## SDK reference

See the [complete SDK reference](./docs/SDK.md) for all methods, execution
types, parameters, return values, and errors.

`submitPool` calls `validatePool` before making an HTTP request. Invalid pools are rejected locally and are not sent to the backend.

The SDK never accepts or stores a private key. Applications create a viem `WalletClient` and pass it only to methods that require signing.
