[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / getPools

# Method: getPools()

<kbd>HTTP</kbd>

```ts
getPools(params: GetPoolsParams): Promise<PoolListResult>;
```

Lists active, non-expired pools through the LopSwap API.

Returned balances are backend-cached estimates and may be `null` or stale.
Use [getPoolBalances](getPoolBalances.md) when current onchain balances are required.
Pool assets have no tokenA/tokenB positional meaning; match them by address.

## Parameters

| Parameter | Type                                                | Required | Description                                          |
| :-------- | :-------------------------------------------------- | :------: | :--------------------------------------------------- |
| `params`  | [`GetPoolsParams`](../interfaces/GetPoolsParams.md) |   Yes    | Pool type, optional filters, cursor, and page limit. |

### params fields

| Parameter              | Type                                                                                      | Required | Description                                                                |
| :--------------------- | :---------------------------------------------------------------------------------------- | :------: | :------------------------------------------------------------------------- |
| `cursor`               | `string`                                                                                  |    No    |                                                                            |
| `limit`                | `number`                                                                                  |    No    |                                                                            |
| `maker`                | `` `0x${string}` ``                                                                       |    No    |                                                                            |
| `minAvailableBalances` | [`BalanceFilters`](../interfaces/BalanceFilters.md)                                       |    No    | Minimum cached available balances in token base units. Requires tokens.    |
| `minBalances`          | [`BalanceFilters`](../interfaces/BalanceFilters.md)                                       |    No    | Minimum cached balances in token base units. Requires tokens.              |
| `tokens`               | readonly \[`` `0x${string}` ``\] or readonly \[`` `0x${string}` ``, `` `0x${string}` ``\] |    No    | One or two token addresses. Filter labels A and B follow this array order. |
| `type`                 | [`PoolType`](../type-aliases/PoolType.md)                                                 |   Yes    |                                                                            |

## Returns

`Promise`\<[`PoolListResult`](../interfaces/PoolListResult.md)\>

A page of pools with provider fee details and the next cursor, if any.

| Field        | Type                              | Required |
| :----------- | :-------------------------------- | :------: |
| `nextCursor` | `string` or `null`                |   Yes    |
| `pools`      | [`Pool`](../interfaces/Pool.md)[] |   Yes    |

## Throws

If filters are invalid or the API request fails.
