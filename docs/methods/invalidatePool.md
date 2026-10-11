[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / invalidatePool

# Method: invalidatePool()

<kbd>Transaction</kbd>

```ts
invalidatePool(order: PoolOrder, walletClient: object): Promise<`0x${string}`>;
```

Invalidates a pool in its pool contract.

This method sends an onchain transaction and returns before confirmation.

## Parameters

| Parameter      | Type                                      | Required | Description                                       |
| :------------- | :---------------------------------------- | :------: | :------------------------------------------------ |
| `order`        | [`PoolOrder`](../interfaces/PoolOrder.md) |   Yes    | Pool order owned by the connected wallet account. |
| `walletClient` | `object`                                  |   Yes    | viem wallet client used to send the transaction.  |

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

`Promise`\<`` `0x${string}` ``\>

Submitted transaction hash.

## Throws

If the maker or chain differs or transaction submission fails.
