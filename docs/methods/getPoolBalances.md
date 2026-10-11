[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / getPoolBalances

# Method: getPoolBalances()

<kbd>RPC read</kbd>

```ts
getPoolBalances(order: PoolOrder): Promise<PoolBalances>;
```

Reads current pool balances directly from the pool contract via RPC.

Values follow the supplied order's `makerAsset` and `takerAsset` direction.

## Parameters

| Parameter | Type                                      | Required | Description                         |
| :-------- | :---------------------------------------- | :------: | :---------------------------------- |
| `order`   | [`PoolOrder`](../interfaces/PoolOrder.md) |   Yes    | Pool order whose balances are read. |

### order fields

| Parameter      | Type                | Required | Description |
| :------------- | :------------------ | :------: | :---------- |
| `extension`    | `` `0x${string}` `` |   Yes    |             |
| `maker`        | `` `0x${string}` `` |   Yes    |             |
| `makerAsset`   | `` `0x${string}` `` |   Yes    |             |
| `makerTraits`  | `bigint`            |   Yes    |             |
| `makingAmount` | `bigint`            |   Yes    |             |
| `receiver`     | `` `0x${string}` `` |   Yes    |             |
| `salt`         | `bigint`            |   Yes    |             |
| `takerAsset`   | `` `0x${string}` `` |   Yes    |             |
| `takingAmount` | `bigint`            |   Yes    |             |

## Returns

`Promise`\<[`PoolBalances`](../interfaces/PoolBalances.md)\>

Current total and available maker/taker asset balances.

| Field                        | Type     | Required | Description                                                     |
| :--------------------------- | :------- | :------: | :-------------------------------------------------------------- |
| `availableMakerAssetBalance` | `bigint` |   Yes    | Currently available balance of the supplied order's makerAsset. |
| `availableTakerAssetBalance` | `bigint` |   Yes    | Currently available balance of the supplied order's takerAsset. |
| `makerAssetBalance`          | `bigint` |   Yes    | Current balance of the supplied order's makerAsset.             |
| `takerAssetBalance`          | `bigint` |   Yes    | Current balance of the supplied order's takerAsset.             |

## Throws

If no RPC URL is configured or the RPC read fails.
