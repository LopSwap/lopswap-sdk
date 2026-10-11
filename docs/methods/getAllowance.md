[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / getAllowance

# Method: getAllowance()

<kbd>RPC read</kbd>

```ts
getAllowance(token: `0x${string}`, owner: `0x${string}`): Promise<bigint>;
```

Reads the owner's current token allowance for the 1inch protocol via RPC.

## Parameters

| Parameter | Type                | Required | Description                      |
| :-------- | :------------------ | :------: | :------------------------------- |
| `token`   | `` `0x${string}` `` |   Yes    | ERC-20 token contract address.   |
| `owner`   | `` `0x${string}` `` |   Yes    | Address whose allowance is read. |

## Returns

`Promise`\<`bigint`\>

Allowance in the token's base units.

## Throws

If no RPC URL is configured or the RPC read fails.
