[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / getPool

# Method: getPool()

<kbd>HTTP</kbd>

```ts
getPool(poolId: `0x${string}`): Promise<PoolDetails>;
```

Gets one pool through the LopSwap API, including inactive or expired pools.

Asset balances in the response are backend-cached estimates.
Pool assets have no tokenA/tokenB positional meaning; match them by address.

## Parameters

| Parameter | Type                | Required | Description                            |
| :-------- | :------------------ | :------: | :------------------------------------- |
| `poolId`  | `` `0x${string}` `` |   Yes    | Deterministic bytes32 pool identifier. |

## Returns

`Promise`\<[`PoolDetails`](../interfaces/PoolDetails.md)\>

Pool status, expiration, provider fee, assets, and signed orders.

| Field                 | Type                                            | Required | Description                                                                        |
| :-------------------- | :---------------------------------------------- | :------: | :--------------------------------------------------------------------------------- |
| `assets`              | [`PoolAsset`](../interfaces/PoolAsset.md)[]     |   Yes    | Pool assets have no positional tokenA/tokenB meaning. Match them by token address. |
| `chainId`             | `number`                                        |   Yes    |                                                                                    |
| `expired`             | `boolean`                                       |   Yes    |                                                                                    |
| `expiresAt`           | `string`                                        |   Yes    |                                                                                    |
| `maker`               | `` `0x${string}` ``                             |   Yes    |                                                                                    |
| `orders`              | [`SignedOrder`](../interfaces/SignedOrder.md)[] |   Yes    |                                                                                    |
| `poolId`              | `` `0x${string}` ``                             |   Yes    |                                                                                    |
| `providerFee`         | `number`                                        |   Yes    | Fee set by the maker providing liquidity, in 1/100,000 units.                      |
| `providerFeeReceiver` | `` `0x${string}` ``                             |   Yes    | Address that receives the liquidity provider fee.                                  |
| `status`              | [`PoolStatus`](../type-aliases/PoolStatus.md)   |   Yes    |                                                                                    |
| `type`                | [`PoolType`](../type-aliases/PoolType.md)       |   Yes    |                                                                                    |

## Throws

If the pool ID is invalid or the API request fails.
