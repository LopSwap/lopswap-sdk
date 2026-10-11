[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / validatePool

# Method: validatePool()

<kbd>Local</kbd>

```ts
validatePool(pool: SignedPool): Promise<void>;
```

Validates pool structure, typed data, order encoding, and signatures locally.

This method performs no HTTP or RPC requests.

## Parameters

| Parameter | Type                                        | Required | Description                                                  |
| :-------- | :------------------------------------------ | :------: | :----------------------------------------------------------- |
| `pool`    | [`SignedPool`](../interfaces/SignedPool.md) |   Yes    | Signed pool to validate against the SDK chain and contracts. |

### pool fields

| Parameter    | Type                                                           | Required | Description |
| :----------- | :------------------------------------------------------------- | :------: | :---------- |
| `chainId`    | `number`                                                       |   Yes    |             |
| `orders`     | readonly [`PoolOrder`](../interfaces/PoolOrder.md)[]           |   Yes    |             |
| `signatures` | readonly `` `0x${string}` ``[]                                 |   Yes    |             |
| `type`       | [`PoolType`](../type-aliases/PoolType.md)                      |   Yes    |             |
| `typedData`  | readonly [`OrderTypedData`](../interfaces/OrderTypedData.md)[] |   Yes    |             |

## Returns

`Promise`\<`void`\>

Nothing when validation succeeds.

## Throws

If any pool, order, typed-data, extension, or signature check fails.
