[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / signPool

# Method: signPool()

<kbd>Wallet</kbd>

```ts
signPool(pool: PreparedPool, walletClient: object): Promise<SignedPool>;
```

Requests an EIP-712 signature for every order in a prepared pool.

This method uses the wallet but does not send an HTTP request or transaction.

## Parameters

| Parameter      | Type                                            | Required | Description                                              |
| :------------- | :---------------------------------------------- | :------: | :------------------------------------------------------- |
| `pool`         | [`PreparedPool`](../interfaces/PreparedPool.md) |   Yes    | Pool returned by [preparePool](preparePool.md).          |
| `walletClient` | `object`                                        |   Yes    | viem wallet client whose account matches the pool maker. |

### pool fields

| Parameter   | Type                                                           | Required | Description |
| :---------- | :------------------------------------------------------------- | :------: | :---------- |
| `chainId`   | `number`                                                       |   Yes    |             |
| `orders`    | readonly [`PoolOrder`](../interfaces/PoolOrder.md)[]           |   Yes    |             |
| `type`      | [`PoolType`](../type-aliases/PoolType.md)                      |   Yes    |             |
| `typedData` | readonly [`OrderTypedData`](../interfaces/OrderTypedData.md)[] |   Yes    |             |

## Returns

`Promise`\<[`SignedPool`](../interfaces/SignedPool.md)\>

The prepared pool with one signature per order.

| Field        | Type                                                           | Required |
| :----------- | :------------------------------------------------------------- | :------: |
| `chainId`    | `number`                                                       |   Yes    |
| `orders`     | readonly [`PoolOrder`](../interfaces/PoolOrder.md)[]           |   Yes    |
| `signatures` | readonly `` `0x${string}` ``[]                                 |   Yes    |
| `type`       | [`PoolType`](../type-aliases/PoolType.md)                      |   Yes    |
| `typedData`  | readonly [`OrderTypedData`](../interfaces/OrderTypedData.md)[] |   Yes    |

## Throws

If the pool is invalid or the wallet account or chain does not match.
