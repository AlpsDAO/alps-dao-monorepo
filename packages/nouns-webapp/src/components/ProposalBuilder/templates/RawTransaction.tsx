import React, { ReactNode } from 'react';
import { FormControl, InputGroup } from 'react-bootstrap';
import { BigNumber, utils } from 'ethers';
import { Trans } from '@lingui/macro';
import { TerminalIcon } from '@heroicons/react/outline';
import clsx from 'clsx';
import { AddressValue, emptyAddress } from '../../../utils/proposalActions/abiInputs';
import {
  canonicalSignature,
  decodeStrict,
  normalizeHex,
  parseAmount,
  parseFunctionSignature,
  ProposalActionTx,
  selectorOf,
} from '../../../utils/proposalActions/encoding';
import AddressInput from '../inputs/AddressInput';
import Field from '../inputs/Field';
import { ActionValidation } from '../types';
import { ActionTemplate, namesFor } from './types';
import classes from '../ProposalBuilder.module.css';

export interface RawTransactionForm {
  target: AddressValue;
  value: string;
  signature: string;
  calldata: string;
}

/** With a signature, the timelock adds the selector itself; a pasted selector would be sent twice. */
const pastedSelector = (form: RawTransactionForm) => {
  const fragment = parseFunctionSignature(form.signature);
  const data = normalizeHex(form.calldata);
  if (!fragment || !data) return undefined;
  const selector = selectorOf(canonicalSignature(fragment));
  return data.startsWith(selector) ? selector : undefined;
};

const validate = (form: RawTransactionForm): ActionValidation => {
  const errors: ActionValidation['errors'] = {};
  const warnings: ReactNode[] = [];

  const value = form.value.trim() ? parseAmount(form.value, 18) : BigNumber.from(0);
  if (!value) errors.value = <Trans>Enter an amount of ETH, like 0.5</Trans>;

  const fragment = form.signature.trim() ? parseFunctionSignature(form.signature) : undefined;
  if (form.signature.trim() && !fragment) {
    errors.signature = (
      <Trans>That isn't a function signature. It looks like transfer(address,uint256).</Trans>
    );
  }

  const calldata = normalizeHex(form.calldata);
  if (calldata === undefined) {
    errors.calldata = <Trans>Enter hex bytes, like 0xa9059cbb…</Trans>;
  } else if (!fragment && calldata !== '0x' && utils.hexDataLength(calldata) < 4) {
    errors.calldata = <Trans>Calldata starts with a 4-byte function selector.</Trans>;
  }

  if (fragment && calldata !== undefined) {
    try {
      decodeStrict(fragment.inputs, calldata);
    } catch {
      warnings.push(
        pastedSelector(form) ? (
          <Trans>
            The data starts with this function's selector. With a signature, leave the selector out:
            the treasury adds it.
          </Trans>
        ) : (
          <Trans>The data doesn't decode as this function's arguments, so the call would likely fail.</Trans>
        ),
      );
    }
  }
  if (!fragment && calldata === '0x' && value?.isZero()) {
    warnings.push(<Trans>With no data and no ETH, this action does nothing.</Trans>);
  }

  const tx: ProposalActionTx | undefined =
    form.target.address && value && calldata !== undefined && !Object.keys(errors).length
      ? {
          target: form.target.address,
          value: value.toString(),
          signature: fragment ? canonicalSignature(fragment) : '',
          calldata,
        }
      : undefined;
  return { tx, errors, warnings, names: namesFor(form.target) };
};

const RawTransactionFormView: ActionTemplate<RawTransactionForm>['Form'] = ({
  form,
  onChange,
  validation,
}) => {
  const fragment = form.signature.trim() ? parseFunctionSignature(form.signature) : undefined;
  const selector = pastedSelector(form);
  return (
    <>
      <p className={classes.hint}>
        <Trans>
          Exactly what the governor stores. With a function signature, the data is only the
          ABI-encoded arguments; without one, it's the full calldata, selector included.
        </Trans>
      </p>
      <Field label={<Trans>Target</Trans>} htmlFor="raw-target">
        <AddressInput
          id="raw-target"
          value={form.target}
          onChange={target => onChange({ ...form, target })}
        />
      </Field>
      <Field label={<Trans>ETH value</Trans>} htmlFor="raw-value" error={validation.errors.value}>
        <InputGroup className={classes.inputGroup}>
          <FormControl
            id="raw-value"
            className={classes.input}
            value={form.value}
            inputMode="decimal"
            placeholder="0"
            autoComplete="off"
            onChange={e => onChange({ ...form, value: e.target.value })}
          />
          <InputGroup.Text className={classes.unit}>ETH</InputGroup.Text>
        </InputGroup>
      </Field>
      <Field
        label={<Trans>Function signature (optional)</Trans>}
        htmlFor="raw-signature"
        error={validation.errors.signature}
        hint={
          fragment && (
            <Trans>
              Stored as <code>{canonicalSignature(fragment)}</code>
            </Trans>
          )
        }
      >
        <FormControl
          id="raw-signature"
          className={clsx(classes.input, classes.mono)}
          value={form.signature}
          placeholder="transfer(address,uint256)"
          spellCheck={false}
          autoComplete="off"
          onChange={e => onChange({ ...form, signature: e.target.value })}
        />
      </Field>
      <Field
        label={fragment ? <Trans>Arguments data</Trans> : <Trans>Calldata</Trans>}
        htmlFor="raw-calldata"
        error={validation.errors.calldata}
      >
        <FormControl
          id="raw-calldata"
          as="textarea"
          rows={4}
          className={clsx(classes.input, classes.mono)}
          value={form.calldata}
          placeholder="0x"
          spellCheck={false}
          onChange={e => onChange({ ...form, calldata: e.target.value })}
        />
        {selector && (
          <button
            type="button"
            className={classes.linkButton}
            style={{ marginTop: '0.35rem' }}
            onClick={() =>
              onChange({ ...form, calldata: `0x${(normalizeHex(form.calldata) ?? '').slice(10)}` })
            }
          >
            <Trans>Remove the selector {selector} from the start</Trans>
          </button>
        )}
      </Field>
    </>
  );
};

const rawTransaction: ActionTemplate<RawTransactionForm> = {
  kind: 'raw',
  title: <Trans>Raw transaction</Trans>,
  description: <Trans>Target, value and calldata, for developers</Trans>,
  icon: TerminalIcon,
  initialForm: () => ({ target: emptyAddress(), value: '', signature: '', calldata: '' }),
  validate,
  Form: RawTransactionFormView,
};

export default rawTransaction;
