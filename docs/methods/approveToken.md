[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / approveToken

# Method: approveToken()

<kbd>Transaction</kbd>

```ts
approveToken(
   token: `0x${string}`,
   walletClient: object,
   amount?: bigint
): Promise<`0x${string}`>;
```

Approves the 1inch protocol to spend an ERC-20 token.

This method sends an onchain transaction and returns before confirmation.

## Parameters

| Parameter      | Type                | Required | Description                                         |
| :------------- | :------------------ | :------: | :-------------------------------------------------- |
| `token`        | `` `0x${string}` `` |   Yes    | ERC-20 token contract address.                      |
| `walletClient` | `object`            |   Yes    | viem wallet client used to send the transaction.    |
| `amount`       | `bigint`            |    No    | Allowance in base units. Defaults to `MAX_UINT256`. |

## Returns

`Promise`\<`` `0x${string}` ``\>

Submitted transaction hash.

## Throws

If the wallet has no account, uses another chain, or submission fails.
