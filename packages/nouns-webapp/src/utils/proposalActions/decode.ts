import { BigNumber, utils } from 'ethers';
import { actionValue, canonicalSignature, decodeStrict, ProposalActionTx, readAll } from './encoding';
import { knownContract, knownContractAbi } from './contracts';

/** What an action means, when it's one we can put in plain words. */
export type ActionIntent =
  | { type: 'eth-transfer'; to: string; amount: BigNumber }
  | { type: 'token-transfer'; token: string; to: string; amount: BigNumber }
  | { type: 'token-approve'; token: string; spender: string; amount: BigNumber }
  | { type: 'weth-wrap'; amount: BigNumber }
  | { type: 'weth-unwrap'; amount: BigNumber }
  | { type: 'alp-transfer'; from: string; to: string; alpId: BigNumber }
  | { type: 'auction-reserve-price'; value: BigNumber }
  | { type: 'auction-time-buffer'; value: BigNumber }
  | { type: 'auction-min-bid-increment'; value: BigNumber }
  | { type: 'auction-pause' }
  | { type: 'auction-unpause' }
  | { type: 'voting-delay'; value: BigNumber }
  | { type: 'voting-period'; value: BigNumber }
  | { type: 'proposal-threshold'; value: BigNumber }
  | { type: 'quorum'; value: BigNumber }
  | { type: 'timelock-delay'; value: BigNumber }
  // A decoded function call with no special meaning
  | { type: 'call' }
  // Calldata without a signature that doesn't match any function we know
  | { type: 'raw-call' }
  // A signature whose data doesn't decode as its parameters
  | { type: 'undecodable' };

export interface DecodedAction {
  tx: ProposalActionTx;
  target: string;
  value: BigNumber;
  /** From the signature, or matched by selector when the action was sent as raw calldata */
  fragment?: utils.FunctionFragment;
  args?: utils.Result;
  /** Empty signature with calldata: the data carries its own selector */
  isRawCalldata: boolean;
  intent: ActionIntent;
}

const isEmptyData = (data: string | undefined) => !data || data === '0x';

const intentFor = (
  target: string,
  fragment: utils.FunctionFragment,
  args: utils.Result,
  value: BigNumber,
): ActionIntent => {
  const signature = canonicalSignature(fragment);
  const contract = knownContract(target);

  // ERC-20 transfers and approvals, on any token
  if (signature === 'transfer(address,uint256)' && contract !== 'token') {
    return { type: 'token-transfer', token: target, to: args[0], amount: args[1] };
  }
  if (signature === 'approve(address,uint256)' && contract !== 'token') {
    return { type: 'token-approve', token: target, spender: args[0], amount: args[1] };
  }

  switch (contract) {
    case 'weth':
      if (signature === 'deposit()') return { type: 'weth-wrap', amount: value };
      if (signature === 'withdraw(uint256)') return { type: 'weth-unwrap', amount: args[0] };
      break;
    case 'token':
      if (
        signature === 'transferFrom(address,address,uint256)' ||
        signature === 'safeTransferFrom(address,address,uint256)'
      ) {
        return { type: 'alp-transfer', from: args[0], to: args[1], alpId: args[2] };
      }
      break;
    case 'auctionHouse':
      if (signature === 'setReservePrice(uint256)') {
        return { type: 'auction-reserve-price', value: args[0] };
      }
      if (signature === 'setTimeBuffer(uint256)') {
        return { type: 'auction-time-buffer', value: args[0] };
      }
      if (signature === 'setMinBidIncrementPercentage(uint8)') {
        return { type: 'auction-min-bid-increment', value: BigNumber.from(args[0]) };
      }
      if (signature === 'pause()') return { type: 'auction-pause' };
      if (signature === 'unpause()') return { type: 'auction-unpause' };
      break;
    case 'governor':
      if (signature === '_setVotingDelay(uint256)') return { type: 'voting-delay', value: args[0] };
      if (signature === '_setVotingPeriod(uint256)') return { type: 'voting-period', value: args[0] };
      if (signature === '_setProposalThresholdBPS(uint256)') {
        return { type: 'proposal-threshold', value: args[0] };
      }
      if (signature === '_setQuorumVotesBPS(uint256)') return { type: 'quorum', value: args[0] };
      break;
    case 'treasury':
      if (signature === 'setDelay(uint256)') return { type: 'timelock-delay', value: args[0] };
      break;
  }
  return { type: 'call' };
};

const GENERIC_ABI = new utils.Interface([
  'function transfer(address to, uint256 amount)',
  'function approve(address spender, uint256 amount)',
]);

/** Finds the function a raw calldata's selector belongs to, among the ABIs we know for the target. */
const matchSelector = (target: string, data: string) => {
  const selector = data.slice(0, 10).toLowerCase();
  const contract = knownContract(target);
  const interfaces = contract ? [knownContractAbi(contract), GENERIC_ABI] : [GENERIC_ABI];
  for (const iface of interfaces) {
    const fragment = Object.values(iface.functions).find(
      f => iface.getSighash(f).toLowerCase() === selector,
    );
    if (fragment) {
      try {
        return { fragment, args: readAll(iface.decodeFunctionData(fragment, data)) };
      } catch {
        // Selector matched but the data doesn't fit; keep looking
      }
    }
  }
  return undefined;
};

export const decodeAction = (tx: ProposalActionTx): DecodedAction => {
  const value = actionValue(tx);
  const base = { tx, target: tx.target, value };

  if (!tx.signature) {
    if (isEmptyData(tx.calldata)) {
      return {
        ...base,
        isRawCalldata: false,
        intent: { type: 'eth-transfer', to: tx.target, amount: value },
      };
    }
    const match = utils.isHexString(tx.calldata) ? matchSelector(tx.target, tx.calldata) : undefined;
    if (!match) return { ...base, isRawCalldata: true, intent: { type: 'raw-call' } };
    return {
      ...base,
      isRawCalldata: true,
      fragment: match.fragment,
      args: match.args,
      intent: intentFor(tx.target, match.fragment, match.args, value),
    };
  }

  let fragment: utils.FunctionFragment;
  try {
    fragment = utils.FunctionFragment.from(tx.signature);
  } catch {
    return { ...base, isRawCalldata: false, intent: { type: 'undecodable' } };
  }
  try {
    const args = decodeStrict(fragment.inputs, tx.calldata || '0x');
    return {
      ...base,
      isRawCalldata: false,
      fragment,
      args,
      intent: intentFor(tx.target, fragment, args, value),
    };
  } catch {
    return { ...base, isRawCalldata: false, fragment, intent: { type: 'undecodable' } };
  }
};
