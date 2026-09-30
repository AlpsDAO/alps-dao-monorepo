import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Form, FormControl, InputGroup } from 'react-bootstrap';
import { Contract, utils } from 'ethers';
import { Trans } from '@lingui/macro';
import { CodeIcon } from '@heroicons/react/outline';
import clsx from 'clsx';
import config from '../../../config';
import {
  AddressValue,
  defaultParamInput,
  emptyAddress,
  ParamInput,
  paramValues,
} from '../../../utils/proposalActions/abiInputs';
import {
  AbiSource,
  isWriteFunction,
  lookupContractAbi,
  parsePastedAbi,
} from '../../../utils/proposalActions/abiLookup';
import {
  canonicalSignature,
  functionAction,
  parseAmount,
  parseFunctionSignature,
} from '../../../utils/proposalActions/encoding';
import {
  getReadProvider,
  knownTokens,
  sameAddress,
  TREASURY_ADDRESS,
} from '../../../utils/proposalActions/contracts';
import { AddressLabel } from '../../ProposalActionSummary';
import AddressInput, { addressValueFor } from '../inputs/AddressInput';
import AbiParamInput from '../inputs/AbiParamInput';
import Field, { Tick } from '../inputs/Field';
import { ActionValidation } from '../types';
import { ActionTemplate, namesFor } from './types';
import classes from '../ProposalBuilder.module.css';

type AbiMode = 'lookup' | 'paste' | 'signature';

export interface ContractCallForm {
  contract: AddressValue;
  abiMode: AbiMode;
  /** The ABI found for `lookup.address` */
  lookup?: {
    address: string;
    functions: string[];
    source: AbiSource;
    contractName?: string;
    implementation?: string;
  };
  pastedAbi: string;
  pastedFunctions?: string[];
  signatureText: string;
  /** Canonical signature of the function picked from the ABI */
  selected?: string;
  args: ParamInput[];
  /** The canonical signature `args` were entered for */
  argsFor?: string;
  value: string;
}

const toFragment = (json: string) => {
  try {
    return utils.FunctionFragment.from(JSON.parse(json));
  } catch {
    return undefined;
  }
};

const abiFunctions = (form: ContractCallForm): utils.FunctionFragment[] | undefined => {
  const json =
    form.abiMode === 'lookup'
      ? sameAddress(form.lookup?.address, form.contract.address)
        ? form.lookup?.functions
        : undefined
      : form.abiMode === 'paste'
      ? form.pastedFunctions
      : undefined;
  return json?.map(toFragment).filter((f): f is utils.FunctionFragment => !!f);
};

const selectedFragment = (form: ContractCallForm, functions = abiFunctions(form)) =>
  form.abiMode === 'signature'
    ? parseFunctionSignature(form.signatureText)
    : functions?.find(f => canonicalSignature(f) === form.selected);

const argsFor = (form: ContractCallForm, fragment: utils.FunctionFragment) =>
  form.argsFor === canonicalSignature(fragment) ? form.args : fragment.inputs.map(defaultParamInput);

const collectNames = (inputs: ParamInput[]): AddressValue[] =>
  inputs.reduce<AddressValue[]>(
    (all, input) =>
      input.kind === 'address'
        ? [...all, input]
        : input.kind === 'list'
        ? [...all, ...collectNames(input.items)]
        : all,
    [],
  );

const validate = (form: ContractCallForm): ActionValidation => {
  const errors: ActionValidation['errors'] = {};
  const warnings: ReactNode[] = [];
  const functions = abiFunctions(form);
  const fragment = selectedFragment(form, functions);

  if (form.abiMode === 'signature' && form.signatureText.trim() && !fragment) {
    errors.signature = (
      <Trans>That isn't a function signature. It looks like transfer(address to, uint256 amount).</Trans>
    );
  }
  if (form.abiMode === 'paste' && form.pastedAbi.trim() && !form.pastedFunctions) {
    errors.abi = <Trans>That isn't ABI JSON with any functions in it.</Trans>;
  }

  const value = form.value.trim() ? parseAmount(form.value, 18) : undefined;
  if (form.value.trim() && !value) errors.value = <Trans>Enter an amount of ETH, like 0.5</Trans>;
  if (value?.gt(0) && fragment && form.abiMode !== 'signature' && !fragment.payable) {
    warnings.push(
      <Trans>This function isn't payable, so sending ETH with it would make the call fail.</Trans>,
    );
  }

  if (!form.contract.address || !fragment || Object.keys(errors).length) return { errors, warnings };
  const args = argsFor(form, fragment);
  const encoded = paramValues(fragment.inputs, args);
  if (encoded.error) return { errors, warnings };

  let tx;
  try {
    tx = functionAction(form.contract.address, fragment, encoded.values, value ?? '0');
  } catch {
    errors.args = <Trans>These arguments couldn't be encoded for this function.</Trans>;
  }
  return {
    tx,
    errors,
    warnings,
    names: namesFor(form.contract, ...collectNames(args)),
  };
};

const functionLabel = (fragment: utils.FunctionFragment) =>
  `${fragment.name}(${fragment.inputs
    .map(input => `${input.format(utils.FormatTypes.sighash)}${input.name ? ` ${input.name}` : ''}`)
    .join(', ')})${fragment.payable ? ' payable' : ''}`;

const quickPicks = () => [
  { address: config.addresses.alpsAuctionHouseProxy, label: <Trans>Auction house</Trans> },
  { address: config.addresses.alpsDAOProxy, label: <Trans>Governor</Trans> },
  { address: TREASURY_ADDRESS, label: <Trans>Treasury</Trans> },
  { address: config.addresses.alpsToken, label: <Trans>Alps token</Trans> },
  ...knownTokens().map(t => ({ address: t.address, label: <>{t.symbol}</> })),
];

const OWNER_ABI = ['function owner() view returns (address)'];

/** The contract's owner(), when its ABI has one. */
const useOwner = (address: string | undefined, functions: utils.FunctionFragment[] | undefined) => {
  const hasOwner = !!functions?.some(f => f.name === 'owner' && f.inputs.length === 0);
  const [owner, setOwner] = useState<{ address: string; owner: string }>();
  useEffect(() => {
    if (!address || !hasOwner) return;
    let active = true;
    new Contract(address, OWNER_ABI, getReadProvider())
      .owner()
      .then((o: string) => active && setOwner({ address, owner: o }))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [address, hasOwner]);
  return hasOwner && owner && sameAddress(owner.address, address) ? owner.owner : undefined;
};

type LookupState = { address: string; status: 'loading' | 'not-verified' | 'not-contract' };

const AbiSourceNote: React.FC<{ lookup: NonNullable<ContractCallForm['lookup']> }> = ({ lookup }) => {
  const name = lookup.contractName;
  const via =
    lookup.source === 'site' ? (
      <Trans>Using the ABI built into this site.</Trans>
    ) : lookup.source === 'sourcify' ? (
      <Trans>Using the verified ABI from Sourcify.</Trans>
    ) : name ? (
      <Trans>Using the verified ABI of {name} from Etherscan.</Trans>
    ) : (
      <Trans>Using the verified ABI from Etherscan.</Trans>
    );
  return (
    <div className={classes.ok}>
      <Tick /> {via}{' '}
      {lookup.implementation && (
        <Trans>
          It's a proxy, so these are the functions of its implementation,{' '}
          <AddressLabel address={lookup.implementation} />, plus the proxy's own.
        </Trans>
      )}
    </div>
  );
};

const ContractCallFormView: ActionTemplate<ContractCallForm>['Form'] = ({
  form,
  onChange,
  validation,
}) => {
  const [lookupState, setLookupState] = useState<LookupState>();
  const [showValue, setShowValue] = useState(!!form.value);
  const address = form.contract.address;
  // The lookup may finish after more edits; apply it to the form as it is then
  const latest = useRef({ form, onChange });
  latest.current = { form, onChange };

  const needsLookup =
    form.abiMode === 'lookup' && !!address && !sameAddress(form.lookup?.address, address);

  useEffect(() => {
    if (!needsLookup || !address) return;
    let active = true;
    setLookupState({ address, status: 'loading' });
    lookupContractAbi(address).then(result => {
      if (!active) return;
      if (result.status === 'found') {
        setLookupState(undefined);
        const current = latest.current;
        current.onChange({ ...current.form, lookup: { address, ...result.lookup }, selected: undefined });
      } else {
        setLookupState({ address, status: result.status });
      }
    });
    return () => {
      active = false;
    };
    // Looks up once per address
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsLookup, address]);

  const functions = useMemo(
    () => abiFunctions(form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.abiMode, form.lookup, form.pastedFunctions, address],
  );
  const writeFunctions = useMemo(
    () => (functions ?? []).filter(isWriteFunction).sort((a, b) => a.name.localeCompare(b.name)),
    [functions],
  );
  const fragment = selectedFragment(form, functions);
  const signature = fragment ? canonicalSignature(fragment) : undefined;
  const args = fragment ? argsFor(form, fragment) : [];
  const currentLookup = lookupState && sameAddress(lookupState.address, address) ? lookupState : undefined;

  const owner = useOwner(address, functions);

  const setArgs = (next: ParamInput[]) => onChange({ ...form, args: next, argsFor: signature });

  const modes: Array<{ mode: AbiMode; label: ReactNode }> = [
    { mode: 'lookup', label: <Trans>Find the ABI</Trans> },
    { mode: 'paste', label: <Trans>Paste the ABI</Trans> },
    { mode: 'signature', label: <Trans>Type the function</Trans> },
  ];

  return (
    <>
      <Field label={<Trans>Contract</Trans>} htmlFor="call-contract">
        <AddressInput
          id="call-contract"
          value={form.contract}
          onChange={contract => onChange({ ...form, contract, selected: undefined })}
          placeholder="0x… contract address or name.eth"
        />
        <div className={classes.chips} style={{ marginTop: '0.5rem' }}>
          {quickPicks()
            .filter(pick => !!pick.address)
            .map(pick => (
              <button
                key={pick.address}
                type="button"
                className={clsx(classes.chip, sameAddress(address, pick.address) && classes.selected)}
                onClick={() => onChange({ ...form, contract: addressValueFor(pick.address), selected: undefined })}
              >
                {pick.label}
              </button>
            ))}
        </div>
      </Field>

      <Field label={<Trans>Function</Trans>}>
        <div className={classes.chips} role="group">
          {modes.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              className={clsx(classes.chip, form.abiMode === mode && classes.selected)}
              aria-pressed={form.abiMode === mode}
              onClick={() => onChange({ ...form, abiMode: mode })}
            >
              {label}
            </button>
          ))}
        </div>

        {form.abiMode === 'lookup' && (
          <>
            {!address && (
              <div className={classes.hint}>
                <Trans>Enter the contract first; its ABI is looked up on Etherscan and Sourcify.</Trans>
              </div>
            )}
            {currentLookup?.status === 'loading' && (
              <div className={classes.pending}>
                <Trans>Looking up the contract's ABI…</Trans>
              </div>
            )}
            {currentLookup?.status === 'not-verified' && (
              <div className={classes.error}>
                <Trans>
                  This contract's source isn't verified on Etherscan or Sourcify. Paste its ABI, or
                  type the function you want to call.
                </Trans>
              </div>
            )}
            {currentLookup?.status === 'not-contract' && (
              <div className={classes.error}>
                <Trans>
                  There's no contract at this address. To send it ETH, use Send ETH instead.
                </Trans>
              </div>
            )}
            {address && form.lookup && sameAddress(form.lookup.address, address) && (
              <AbiSourceNote lookup={form.lookup} />
            )}
          </>
        )}

        {form.abiMode === 'paste' && (
          <>
            <FormControl
              as="textarea"
              rows={4}
              className={clsx(classes.input, classes.mono)}
              style={{ marginTop: '0.5rem' }}
              value={form.pastedAbi}
              placeholder='[{"type":"function","name":"transfer",…}]'
              spellCheck={false}
              onChange={e =>
                onChange({
                  ...form,
                  pastedAbi: e.target.value,
                  pastedFunctions: parsePastedAbi(e.target.value),
                  selected: undefined,
                })
              }
            />
            {validation.errors.abi && <div className={classes.error}>{validation.errors.abi}</div>}
          </>
        )}

        {form.abiMode === 'signature' && (
          <>
            <FormControl
              className={clsx(classes.input, classes.mono)}
              style={{ marginTop: '0.5rem' }}
              value={form.signatureText}
              placeholder="transfer(address to, uint256 amount)"
              spellCheck={false}
              autoComplete="off"
              onChange={e => onChange({ ...form, signatureText: e.target.value })}
            />
            {validation.errors.signature ? (
              <div className={classes.error}>{validation.errors.signature}</div>
            ) : signature ? (
              <div className={classes.hint}>
                <Trans>
                  Stored on-chain as <code>{signature}</code>
                </Trans>
              </div>
            ) : (
              <div className={classes.hint}>
                <Trans>
                  The function's name and parameter types, as in its Solidity source. Parameter
                  names are optional.
                </Trans>
              </div>
            )}
          </>
        )}

        {form.abiMode !== 'signature' && functions && (
          <Form.Select
            className={classes.input}
            style={{ marginTop: '0.5rem' }}
            value={form.selected ?? ''}
            onChange={e => onChange({ ...form, selected: e.target.value || undefined })}
            aria-label="Function"
          >
            <option value="">
              {writeFunctions.length ? 'Pick a function…' : 'This ABI has no functions that change anything'}
            </option>
            {writeFunctions.map(f => (
              <option key={canonicalSignature(f)} value={canonicalSignature(f)}>
                {functionLabel(f)}
              </option>
            ))}
          </Form.Select>
        )}
      </Field>

      {fragment && fragment.inputs.length > 0 && (
        <div className={classes.field}>
          {fragment.inputs.map((input, i) => (
            <AbiParamInput
              key={`${signature}-${i}`}
              id={`call-arg-${i}`}
              param={input}
              value={args[i] ?? defaultParamInput(input)}
              onChange={v => setArgs(args.map((existing, j) => (j === i ? v : existing)))}
            />
          ))}
          {validation.errors.args && <div className={classes.error}>{validation.errors.args}</div>}
        </div>
      )}
      {fragment && fragment.inputs.length === 0 && (
        <p className={classes.hint}>
          <Trans>This function takes no arguments.</Trans>
        </p>
      )}

      {fragment &&
        (showValue || fragment.payable || form.value ? (
          <Field
            label={<Trans>ETH to send with the call</Trans>}
            htmlFor="call-value"
            error={validation.errors.value}
            hint={<Trans>Optional. Only functions marked payable accept ETH.</Trans>}
          >
            <InputGroup className={classes.inputGroup}>
              <FormControl
                id="call-value"
                className={classes.input}
                value={form.value}
                inputMode="decimal"
                placeholder="0.0"
                autoComplete="off"
                onChange={e => onChange({ ...form, value: e.target.value })}
              />
              <InputGroup.Text className={classes.unit}>ETH</InputGroup.Text>
            </InputGroup>
          </Field>
        ) : (
          <button type="button" className={classes.linkButton} onClick={() => setShowValue(true)}>
            <Trans>Also send ETH with this call</Trans>
          </button>
        ))}

      {owner && !sameAddress(owner, TREASURY_ADDRESS) && (
        <p className={classes.hint}>
          <Trans>
            This contract's owner is <AddressLabel address={owner} />, not the treasury, so any
            function only its owner can call would fail.
          </Trans>
        </p>
      )}
    </>
  );
};

const contractCall: ActionTemplate<ContractCallForm> = {
  kind: 'contract-call',
  title: <Trans>Call a contract</Trans>,
  description: <Trans>Any function on any contract, from its ABI</Trans>,
  icon: CodeIcon,
  initialForm: () => ({
    contract: emptyAddress(),
    abiMode: 'lookup',
    pastedAbi: '',
    signatureText: '',
    args: [],
    value: '',
  }),
  validate,
  Form: ContractCallFormView,
};

export default contractCall;
