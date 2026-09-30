import { BigNumber, utils } from 'ethers';
import { normalizeHex, parseAmount, parseInteger } from './encoding';

/** An address typed by hand: a 0x address or an ENS name, and what it resolved to. */
export interface AddressValue {
  text: string;
  /** Checksummed, once the text is a valid address or its ENS name resolved */
  address?: string;
  /** The ENS name the address came from */
  ensName?: string;
}

export const emptyAddress = (): AddressValue => ({ text: '' });

/** Form state for one ABI parameter; arrays and tuples nest. JSON-safe so drafts can store it. */
export type ParamInput =
  | { kind: 'text'; text: string }
  | ({ kind: 'address' } & AddressValue)
  | { kind: 'number'; text: string; eth?: boolean }
  | { kind: 'bool'; value: boolean }
  | { kind: 'list'; items: ParamInput[] };

export type ParamError =
  | { code: 'required' }
  | { code: 'address' }
  | { code: 'integer' }
  | { code: 'eth-amount' }
  | { code: 'range'; min: string; max: string }
  | { code: 'hex' }
  | { code: 'bytes-length'; expected: number; actual: number }
  | { code: 'array-length'; expected: number };

const isInteger = (type: string) => /^u?int\d*$/.test(type);
const bitsOf = (type: string) => parseInt(type.replace(/^u?int/, '') || '256', 10);

export const integerRange = (type: string) => {
  const bits = bitsOf(type);
  if (type.startsWith('u')) {
    return { min: BigNumber.from(0), max: BigNumber.from(2).pow(bits).sub(1) };
  }
  const half = BigNumber.from(2).pow(bits - 1);
  return { min: half.mul(-1), max: half.sub(1) };
};

const fixedBytesLength = (type: string) => {
  if (type === 'function') return 24;
  const match = type.match(/^bytes(\d+)$/);
  return match ? parseInt(match[1], 10) : undefined;
};

export const defaultParamInput = (param: utils.ParamType): ParamInput => {
  if (param.baseType === 'array') {
    const length = param.arrayLength ?? -1;
    return {
      kind: 'list',
      items: length > 0 ? Array.from({ length }, () => defaultParamInput(param.arrayChildren)) : [],
    };
  }
  if (param.baseType === 'tuple') {
    return { kind: 'list', items: (param.components ?? []).map(defaultParamInput) };
  }
  if (param.baseType === 'address') return { kind: 'address', text: '' };
  if (param.baseType === 'bool') return { kind: 'bool', value: false };
  if (isInteger(param.baseType)) return { kind: 'number', text: '' };
  return { kind: 'text', text: '' };
};

/** Validates one non-array, non-tuple parameter. */
export const leafValue = (
  param: utils.ParamType,
  input: ParamInput,
): { value: unknown; error?: undefined } | { value?: undefined; error: ParamError } => {
  const type = param.baseType;
  if (type === 'address') {
    if (input.kind !== 'address' || !input.text.trim()) return { error: { code: 'required' } };
    if (!input.address) return { error: { code: 'address' } };
    return { value: input.address };
  }
  if (type === 'bool') {
    return { value: input.kind === 'bool' ? input.value : false };
  }
  if (isInteger(type)) {
    if (input.kind !== 'number' || !input.text.trim()) return { error: { code: 'required' } };
    const parsed = input.eth ? parseAmount(input.text, 18) : parseInteger(input.text);
    if (!parsed) return { error: { code: input.eth ? 'eth-amount' : 'integer' } };
    const { min, max } = integerRange(type);
    if (parsed.lt(min) || parsed.gt(max)) {
      return { error: { code: 'range', min: min.toString(), max: max.toString() } };
    }
    return { value: parsed };
  }
  if (type === 'string') {
    return { value: input.kind === 'text' ? input.text : '' };
  }
  // bytes, bytesN
  const text = input.kind === 'text' ? input.text : '';
  const hex = normalizeHex(text);
  if (hex === undefined) return { error: { code: 'hex' } };
  const expected = fixedBytesLength(type);
  if (expected !== undefined) {
    if (!text.trim()) return { error: { code: 'required' } };
    const actual = utils.hexDataLength(hex);
    if (actual !== expected) return { error: { code: 'bytes-length', expected, actual } };
  }
  return { value: hex };
};

/** Converts the whole input tree to values for the ABI coder; stops at the first problem. */
export const paramValue = (
  param: utils.ParamType,
  input: ParamInput,
): { value: unknown; error?: undefined } | { value?: undefined; error: ParamError } => {
  if (param.baseType === 'array' || param.baseType === 'tuple') {
    const items = input.kind === 'list' ? input.items : [];
    const children =
      param.baseType === 'tuple'
        ? param.components
        : items.map(() => param.arrayChildren);
    if (param.baseType === 'array' && (param.arrayLength ?? -1) >= 0 && items.length !== param.arrayLength) {
      return { error: { code: 'array-length', expected: param.arrayLength } };
    }
    const values: unknown[] = [];
    for (let i = 0; i < children.length; i++) {
      const child = paramValue(children[i], items[i] ?? defaultParamInput(children[i]));
      if (child.error) return child;
      values.push(child.value);
    }
    return { value: values };
  }
  return leafValue(param, input);
};

export const paramValues = (params: utils.ParamType[], inputs: ParamInput[]) => {
  const values: unknown[] = [];
  for (let i = 0; i < params.length; i++) {
    const result = paramValue(params[i], inputs[i] ?? defaultParamInput(params[i]));
    if (result.error) return { error: result.error, index: i };
    values.push(result.value);
  }
  return { values };
};

/** A short type label: "uint256", "address[]", "tuple(uint256,address)" */
export const typeLabel = (param: utils.ParamType) => param.format(utils.FormatTypes.sighash);
