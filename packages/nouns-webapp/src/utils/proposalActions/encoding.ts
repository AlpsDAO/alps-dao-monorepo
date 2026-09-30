import { BigNumber, utils } from 'ethers';

/**
 * One proposal action exactly as the governor stores it. Following the Nouns convention, `calldata`
 * holds only the ABI-encoded arguments when `signature` is set; with an empty signature it's the full
 * calldata, selector included ("0x" for a plain ETH transfer). The timelock handles both.
 */
export interface ProposalActionTx {
  target: string;
  /** wei, as a decimal string */
  value: string;
  signature: string;
  calldata: string;
}

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** Parses a signature typed by hand ("function transfer(address to, uint256 amount) external"). */
export const parseFunctionSignature = (text: string): utils.FunctionFragment | undefined => {
  const trimmed = text.trim().replace(/;$/, '');
  if (!trimmed) return undefined;
  try {
    const fragment = utils.Fragment.from(
      /^function\s/.test(trimmed) ? trimmed : `function ${trimmed}`,
    );
    return fragment instanceof utils.FunctionFragment ? fragment : undefined;
  } catch {
    return undefined;
  }
};

/** The canonical form stored on-chain, e.g. "transfer(address,uint256)" */
export const canonicalSignature = (fragment: utils.FunctionFragment) =>
  fragment.format(utils.FormatTypes.sighash);

export const functionAction = (
  target: string,
  fragment: utils.FunctionFragment | string,
  args: unknown[],
  value: BigNumber | string = '0',
): ProposalActionTx => {
  const f = typeof fragment === 'string' ? utils.FunctionFragment.from(fragment) : fragment;
  return {
    target: utils.getAddress(target),
    value: BigNumber.from(value).toString(),
    signature: canonicalSignature(f),
    calldata: utils.defaultAbiCoder.encode(f.inputs, args),
  };
};

export const ethTransferAction = (to: string, amount: BigNumber): ProposalActionTx => ({
  target: utils.getAddress(to),
  value: amount.toString(),
  signature: '',
  calldata: '0x',
});

/** Reads every decoded value: ethers decodes lazily and only throws when a bad value is read. */
export const readAll = <T>(result: T): T => {
  const touch = (value: unknown) => {
    if (Array.isArray(value)) for (let i = 0; i < value.length; i++) touch(value[i]);
  };
  touch(result);
  return result;
};

export const decodeStrict = (types: ReadonlyArray<utils.ParamType | string>, data: string) =>
  readAll(utils.defaultAbiCoder.decode(types, data));

export const selectorOf = (signature: string) => utils.id(signature).slice(0, 10);

/** The calldata the timelock actually sends to the target. */
export const fullCalldata = (tx: ProposalActionTx) =>
  tx.signature ? utils.hexConcat([selectorOf(tx.signature), tx.calldata || '0x']) : tx.calldata || '0x';

export const actionValue = (tx: ProposalActionTx) => {
  try {
    return BigNumber.from(tx.value || 0);
  } catch {
    return BigNumber.from(0);
  }
};

export const totalValue = (txs: ProposalActionTx[]) =>
  txs.reduce((sum, tx) => sum.add(actionValue(tx)), BigNumber.from(0));

/**
 * The governor queues each action in the timelock under a hash of (target, value, signature, data,
 * eta), so two identical actions in one proposal make queueing revert. Returns the positions (0-based)
 * of every action that repeats an earlier one.
 */
export const duplicateActionIndexes = (txs: ProposalActionTx[]) => {
  const seen: Record<string, number> = {};
  const duplicates: Array<[number, number]> = [];
  txs.forEach((tx, i) => {
    const key = [
      tx.target.toLowerCase(),
      actionValue(tx).toString(),
      tx.signature,
      (tx.calldata || '0x').toLowerCase(),
    ].join('|');
    if (seen[key] !== undefined) duplicates.push([seen[key], i]);
    else seen[key] = i;
  });
  return duplicates;
};

/** Accepts "1,000.5" or "1_000.5"; returns undefined unless it's a plain non-negative decimal. */
export const cleanDecimal = (text: string) => {
  const cleaned = text.trim().replace(/[,_\s]/g, '');
  return /^(\d+\.?\d*|\.\d+)$/.test(cleaned) ? cleaned : undefined;
};

export const parseAmount = (text: string, decimals: number): BigNumber | undefined => {
  const cleaned = cleanDecimal(text);
  if (cleaned === undefined) return undefined;
  const [, fraction = ''] = cleaned.split('.');
  if (fraction.length > decimals) return undefined;
  try {
    return utils.parseUnits(cleaned.endsWith('.') ? cleaned.slice(0, -1) : cleaned, decimals);
  } catch {
    return undefined;
  }
};

/** Whole numbers only, decimal or 0x-hex, commas and underscores allowed as separators. */
export const parseInteger = (text: string): BigNumber | undefined => {
  const cleaned = text.trim().replace(/[,_\s]/g, '');
  if (!/^-?(\d+|0x[0-9a-fA-F]+)$/.test(cleaned)) return undefined;
  try {
    if (cleaned.startsWith('-')) return BigNumber.from(cleaned.slice(1)).mul(-1);
    return BigNumber.from(cleaned);
  } catch {
    return undefined;
  }
};

/** Formats an amount with thousands separators and at most `maxDecimals` decimals, without rounding up. */
export const formatUnitsReadable = (amount: BigNumber, decimals: number, maxDecimals = 6) => {
  const [whole, fraction = ''] = utils.formatUnits(amount, decimals).split('.');
  const trimmed = fraction.slice(0, maxDecimals).replace(/0+$/, '');
  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (!trimmed && !amount.isZero() && fraction.replace(/0+$/, '')) {
    // Too small to show at this precision
    return `${wholeWithCommas}.${fraction.replace(/0+$/, '')}`;
  }
  return trimmed ? `${wholeWithCommas}.${trimmed}` : wholeWithCommas;
};

export const formatEth = (amount: BigNumber, maxDecimals = 18) =>
  formatUnitsReadable(amount, 18, maxDecimals);

export const formatInteger = (value: BigNumber | number) =>
  BigNumber.from(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Normalizes hex typed by hand: adds 0x, lowercases; undefined unless whole bytes of hex. */
export const normalizeHex = (text: string): string | undefined => {
  const trimmed = text.trim().replace(/\s/g, '');
  const hex = trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) return undefined;
  return `0x${hex.toLowerCase()}`;
};
