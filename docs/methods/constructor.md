[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / constructor

# Constructor: new LopSwap()

<kbd>Local</kbd>

```ts
new LopSwap(config: LopSwapConfig): LopSwap;
```

Creates a LopSwap SDK instance bound to the configured chain.

## Parameters

| Parameter | Type                                              | Required | Description                                     |
| :-------- | :------------------------------------------------ | :------: | :---------------------------------------------- |
| `config`  | [`LopSwapConfig`](../interfaces/LopSwapConfig.md) |   Yes    | API URL, chain, and optional JSON-RPC endpoint. |

### config fields

| Parameter | Type     | Required | Description                               |
| :-------- | :------- | :------: | :---------------------------------------- |
| `apiUrl`  | `string` |   Yes    |                                           |
| `chainId` | `number` |   Yes    |                                           |
| `rpcUrl`  | `string` |    No    | JSON-RPC endpoint used for onchain reads. |

## Returns

[`LopSwap`](../SDK.md)

## Throws

If the chain is not supported.
