[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / setLiquidity

# Method: setLiquidity()

<kbd>Transaction</kbd>

```ts
setLiquidity(
   order: PoolOrder,
   liquidity: readonly LiquidityAmount[],
   walletClient: object
): Promise<`0x${string}`>;
```

Updates liquidity limits in the pool contract.

This method sends an onchain transaction and returns before confirmation.

## Parameters

| Parameter      | Type                                                             | Required | Description                                            |
| :------------- | :--------------------------------------------------------------- | :------: | :----------------------------------------------------- |
| `order`        | [`PoolOrder`](../interfaces/PoolOrder.md)                        |   Yes    | Pool order owned by the connected wallet account.      |
| `liquidity`    | readonly [`LiquidityAmount`](../interfaces/LiquidityAmount.md)[] |   Yes    | One or more token addresses and amounts in base units. |
| `walletClient` | `object`                                                         |   Yes    | viem wallet client used to send the transaction.       |

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

### liquidity fields

| Parameter | Type                | Required | Description |
| :-------- | :------------------ | :------: | :---------- |
| `amount`  | `bigint`            |   Yes    |             |
| `asset`   | `` `0x${string}` `` |   Yes    |             |

## Returns

`Promise`\<`` `0x${string}` ``\>

Submitted transaction hash.

## Throws

If liquidity is empty, the maker or chain differs, or submission fails.
