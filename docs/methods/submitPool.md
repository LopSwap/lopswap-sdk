[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / submitPool

# Method: submitPool()

<kbd>Local</kbd> <kbd>HTTP</kbd>

```ts
submitPool(pool: SignedPool): Promise<CreatePoolResult>;
```

Validates a signed pool locally and submits it to the LopSwap API.

Invalid pools are rejected before the HTTP request is made.

## Parameters

| Parameter | Type                                        | Required | Description                                             |
| :-------- | :------------------------------------------ | :------: | :------------------------------------------------------ |
| `pool`    | [`SignedPool`](../interfaces/SignedPool.md) |   Yes    | Prepared pool with one valid maker signature per order. |

### pool fields

| Parameter    | Type                                                           | Required | Description |
| :----------- | :------------------------------------------------------------- | :------: | :---------- |
| `chainId`    | `number`                                                       |   Yes    |             |
| `orders`     | readonly [`PoolOrder`](../interfaces/PoolOrder.md)[]           |   Yes    |             |
| `signatures` | readonly `` `0x${string}` ``[]                                 |   Yes    |             |
| `type`       | [`PoolType`](../type-aliases/PoolType.md)                      |   Yes    |             |
| `typedData`  | readonly [`OrderTypedData`](../interfaces/OrderTypedData.md)[] |   Yes    |             |

## Returns

`Promise`\<[`CreatePoolResult`](../interfaces/CreatePoolResult.md)\>

The chain, deterministic pool ID, and submitted pool type.

| Field     | Type                                      | Required |
| :-------- | :---------------------------------------- | :------: |
| `chainId` | `number`                                  |   Yes    |
| `poolId`  | `` `0x${string}` ``                       |   Yes    |
| `type`    | [`PoolType`](../type-aliases/PoolType.md) |   Yes    |

## Throws

If local validation fails or the API returns an error.
