export const erc20Abi = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const orderComponents = [
  { name: 'salt', type: 'uint256' },
  { name: 'maker', type: 'uint256' },
  { name: 'receiver', type: 'uint256' },
  { name: 'makerAsset', type: 'uint256' },
  { name: 'takerAsset', type: 'uint256' },
  { name: 'makingAmount', type: 'uint256' },
  { name: 'takingAmount', type: 'uint256' },
  { name: 'makerTraits', type: 'uint256' },
] as const

export const lopSwapAbi = [
  {
    type: 'function',
    name: 'getPool',
    stateMutability: 'pure',
    inputs: [{ name: 'order', type: 'tuple', components: orderComponents }],
    outputs: [{ name: 'pool', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'poolStatus',
    stateMutability: 'view',
    inputs: [{ name: 'pool', type: 'bytes32' }],
    outputs: [{ name: 'status', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getBalances',
    stateMutability: 'view',
    inputs: [{ name: 'order', type: 'tuple', components: orderComponents }],
    outputs: [
      { name: 'makerAssetBalance', type: 'uint256' },
      { name: 'takerAssetBalance', type: 'uint256' },
      { name: 'availableMakerAssetBalance', type: 'uint256' },
      { name: 'availableTakerAssetBalance', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'setLiquidity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'order', type: 'tuple', components: orderComponents },
      { name: 'assets', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'invalidatePool',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'order', type: 'tuple', components: orderComponents }],
    outputs: [],
  },
] as const

export const limitOrderProtocolAbi = [
  {
    type: 'function',
    name: 'rawRemainingInvalidatorForOrder',
    stateMutability: 'view',
    inputs: [
      { name: 'maker', type: 'address' },
      { name: 'orderHash', type: 'bytes32' },
    ],
    outputs: [{ name: 'remainingRaw', type: 'uint256' }],
  },
] as const
