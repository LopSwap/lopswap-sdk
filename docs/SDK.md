# @lopswap/sdk

Client for creating, discovering, and managing LopSwap pools on one chain.

## Constructor

| Method                                    | Execution | Description                                                   |
| :---------------------------------------- | :-------- | :------------------------------------------------------------ |
| [`new LopSwap()`](methods/constructor.md) | Local     | Creates a LopSwap SDK instance bound to the configured chain. |

## Methods

### Pool creation

| Method                                      | Execution             | Description                                                                   |
| :------------------------------------------ | :-------------------- | :---------------------------------------------------------------------------- |
| [`createPool()`](methods/createPool.md)     | Local + Wallet + HTTP | Prepares, signs, validates, and submits a pool.                               |
| [`preparePool()`](methods/preparePool.md)   | Local                 | Builds pool orders and EIP-712 typed data locally.                            |
| [`signPool()`](methods/signPool.md)         | Wallet                | Requests an EIP-712 signature for every order in a prepared pool.             |
| [`validatePool()`](methods/validatePool.md) | Local                 | Validates pool structure, typed data, order encoding, and signatures locally. |
| [`submitPool()`](methods/submitPool.md)     | Local + HTTP          | Validates a signed pool locally and submits it to the LopSwap API.            |

### Discovery

| Method                                      | Execution | Description                                                                 |
| :------------------------------------------ | :-------- | :-------------------------------------------------------------------------- |
| [`getPools()`](methods/getPools.md)         | HTTP      | Lists active, non-expired pools through the LopSwap API.                    |
| [`getPool()`](methods/getPool.md)           | HTTP      | Gets one pool through the LopSwap API, including inactive or expired pools. |
| [`getPoolTypes()`](methods/getPoolTypes.md) | HTTP      | Lists pool types and their active pool counts through the LopSwap API.      |
| [`getChains()`](methods/getChains.md)       | HTTP      | Lists chains supported by the LopSwap API.                                  |
| [`getTokens()`](methods/getTokens.md)       | HTTP      | Lists known token metadata for the SDK chain through the LopSwap API.       |
| [`getToken()`](methods/getToken.md)         | HTTP      | Gets known token metadata through the LopSwap API.                          |

### Onchain reads

| Method                                                          | Execution | Description                                                               |
| :-------------------------------------------------------------- | :-------- | :------------------------------------------------------------------------ |
| [`getAllowance()`](methods/getAllowance.md)                     | RPC read  | Reads the owner's current token allowance for the 1inch protocol via RPC. |
| [`getPoolBalances()`](methods/getPoolBalances.md)               | RPC read  | Reads current pool balances directly from the pool contract via RPC.      |
| [`getPoolStatus()`](methods/getPoolStatus.md)                   | RPC read  | Reads the pool contract's current status via RPC.                         |
| [`getPoolAndOrdersStatus()`](methods/getPoolAndOrdersStatus.md) | RPC read  | Reads the pool status and every order's status in the 1inch protocol.     |

### Transactions

| Method                                          | Execution   | Description                                           |
| :---------------------------------------------- | :---------- | :---------------------------------------------------- |
| [`approveToken()`](methods/approveToken.md)     | Transaction | Approves the 1inch protocol to spend an ERC-20 token. |
| [`setLiquidity()`](methods/setLiquidity.md)     | Transaction | Updates liquidity limits in the pool contract.        |
| [`invalidatePool()`](methods/invalidatePool.md) | Transaction | Invalidates a pool in its pool contract.              |

## Errors

- [`LopSwapHttpError`](classes/LopSwapHttpError.md) — Error returned by the LopSwap HTTP API.
- [`LopSwapValidationError`](classes/LopSwapValidationError.md) — Error raised when a prepared or signed pool fails local validation.
