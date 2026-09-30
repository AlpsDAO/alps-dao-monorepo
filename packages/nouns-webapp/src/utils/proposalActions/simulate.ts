import { utils } from 'ethers';
import { getReadProvider, TREASURY_ADDRESS } from './contracts';
import { actionValue, fullCalldata, ProposalActionTx } from './encoding';

export type SimulationResult =
  | { status: 'ok' }
  // The treasury doesn't hold the ETH this action sends
  | { status: 'insufficient-eth' }
  | { status: 'reverted'; reason?: string }
  // The check itself couldn't run (network, RPC without eth_call overrides...)
  | { status: 'unavailable'; message?: string };

const ERROR_SELECTOR = '0x08c379a0'; // Error(string)
const PANIC_SELECTOR = '0x4e487b71'; // Panic(uint256)

const decodeRevertData = (data: unknown): string | undefined => {
  if (typeof data !== 'string' || !utils.isHexString(data)) return undefined;
  try {
    if (data.startsWith(ERROR_SELECTOR)) {
      return utils.defaultAbiCoder.decode(['string'], utils.hexDataSlice(data, 4))[0];
    }
    if (data.startsWith(PANIC_SELECTOR)) {
      const code = utils.defaultAbiCoder.decode(['uint256'], utils.hexDataSlice(data, 4))[0];
      return `panic 0x${code.toHexString().slice(2).replace(/^0+(?=.)/, '')}`;
    }
  } catch {}
  return data !== '0x' ? `custom error ${data.slice(0, 10)}` : undefined;
};

/** The JSON-RPC error from an ethers `send` failure: { code, message, data } */
const rpcError = (e: any): { code?: number; message?: string; data?: unknown } => {
  if (e?.body) {
    try {
      const parsed = JSON.parse(e.body);
      if (parsed?.error) return parsed.error;
    } catch {}
  }
  return { code: e?.error?.code ?? e?.code, message: e?.error?.message ?? e?.message, data: e?.data };
};

/**
 * Runs the action with eth_call as if the treasury sent it now, on its own. It can't account for
 * earlier actions in the same proposal, or for changes before the proposal executes.
 */
export const simulateAction = async (tx: ProposalActionTx): Promise<SimulationResult> => {
  const provider = getReadProvider();
  const call = {
    from: TREASURY_ADDRESS,
    to: tx.target,
    value: utils.hexValue(actionValue(tx)),
    data: fullCalldata(tx),
  };
  try {
    await provider.send('eth_call', [call, 'latest']);
    return { status: 'ok' };
  } catch (e) {
    const { code, message = '', data } = rpcError(e);
    if (/out ?of ?funds|insufficient (funds|balance)/i.test(message)) {
      return { status: 'insufficient-eth' };
    }
    const reverted = code === 3 || /revert/i.test(message) || data !== undefined;
    if (reverted) {
      const fromMessage = message.match(/execution reverted:?\s*(.+)$/i)?.[1];
      return { status: 'reverted', reason: decodeRevertData(data) ?? fromMessage };
    }
    return { status: 'unavailable', message };
  }
};
