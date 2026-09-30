import React, { ReactNode } from 'react';
import { Form, FormControl, InputGroup } from 'react-bootstrap';
import { utils } from 'ethers';
import { Trans } from '@lingui/macro';
import clsx from 'clsx';
import { PlusIcon, XIcon } from '@heroicons/react/solid';
import {
  defaultParamInput,
  leafValue,
  ParamError,
  ParamInput,
  typeLabel,
} from '../../../utils/proposalActions/abiInputs';
import { formatInteger } from '../../../utils/proposalActions/encoding';
import AddressInput from './AddressInput';
import classes from '../ProposalBuilder.module.css';

export const ParamErrorMessage: React.FC<{ error: ParamError; type: string }> = ({ error, type }) => {
  switch (error.code) {
    case 'required':
      return <Trans>Required</Trans>;
    case 'address':
      return <Trans>Enter an address or ENS name</Trans>;
    case 'integer':
      return <Trans>Enter a whole number</Trans>;
    case 'eth-amount':
      return <Trans>Enter an amount of ETH, with at most 18 decimals</Trans>;
    case 'range':
      return <Trans>That number doesn't fit in a {type}</Trans>;
    case 'hex':
      return <Trans>Enter hex bytes, like 0x1234abcd</Trans>;
    case 'bytes-length': {
      const { expected, actual } = error;
      return (
        <Trans>
          Must be exactly {expected} bytes; this is {actual}
        </Trans>
      );
    }
    case 'array-length': {
      const { expected } = error;
      return <Trans>Needs exactly {expected} items</Trans>;
    }
  }
};

const isInteger = (type: string) => /^u?int\d*$/.test(type);

const hasText = (input: ParamInput) =>
  (input.kind === 'text' || input.kind === 'number' || input.kind === 'address') &&
  input.text.trim() !== '';

const LeafInput: React.FC<{
  id: string;
  param: utils.ParamType;
  value: ParamInput;
  onChange: (value: ParamInput) => void;
}> = ({ id, param, value, onChange }) => {
  const type = param.baseType;
  const result = leafValue(param, value);
  // Say what's wrong only once something's been typed; addresses explain themselves
  const error =
    result.error && hasText(value) && type !== 'address' ? (
      <div className={classes.error}>
        <ParamErrorMessage error={result.error} type={param.type} />
      </div>
    ) : null;

  if (type === 'address') {
    return (
      <AddressInput
        id={id}
        value={value.kind === 'address' ? value : { text: '' }}
        onChange={v => onChange({ kind: 'address', ...v })}
      />
    );
  }

  if (type === 'bool') {
    const checked = value.kind === 'bool' && value.value;
    return (
      <div className={classes.switchRow}>
        <Form.Check
          type="switch"
          id={id}
          checked={checked}
          onChange={e => onChange({ kind: 'bool', value: e.target.checked })}
          label={checked ? 'true' : 'false'}
        />
      </div>
    );
  }

  if (isInteger(type)) {
    const number = value.kind === 'number' ? value : { kind: 'number' as const, text: '' };
    const wei =
      number.eth && result.value !== undefined ? formatInteger(result.value as any) : undefined;
    return (
      <>
        <InputGroup className={classes.inputGroup}>
          <FormControl
            id={id}
            className={clsx(classes.input, classes.mono)}
            value={number.text}
            inputMode={number.eth ? 'decimal' : 'numeric'}
            placeholder={number.eth ? '0.0' : '0'}
            autoComplete="off"
            onChange={e => onChange({ ...number, text: e.target.value })}
          />
          <button
            type="button"
            className={clsx(classes.unitToggle, number.eth && classes.active)}
            aria-pressed={!!number.eth}
            title="Enter this number in ETH: it's multiplied by 10^18"
            onClick={() => onChange({ ...number, eth: !number.eth })}
          >
            ETH
          </button>
        </InputGroup>
        {error}
        {wei && (
          <div className={classes.hint}>
            <Trans>= {wei} wei</Trans>
          </div>
        )}
      </>
    );
  }

  const text = value.kind === 'text' ? value.text : '';
  const isString = type === 'string';
  return (
    <>
      <FormControl
        id={id}
        className={clsx(classes.input, !isString && classes.mono)}
        value={text}
        placeholder={isString ? '' : '0x'}
        spellCheck={false}
        autoComplete="off"
        onChange={e => onChange({ kind: 'text', text: e.target.value })}
      />
      {error}
    </>
  );
};

/** A typed input for one ABI parameter; arrays get rows you can add and remove, tuples nest. */
const AbiParamInput: React.FC<{
  id: string;
  param: utils.ParamType;
  value: ParamInput;
  onChange: (value: ParamInput) => void;
  label?: ReactNode;
  onRemove?: () => void;
}> = ({ id, param, value, onChange, label, onRemove }) => {
  const title = (
    <span className={classes.label}>
      {label ?? (param.name || <Trans>Value</Trans>)}
      <span className={classes.paramType}>{typeLabel(param)}</span>
    </span>
  );
  const items = value.kind === 'list' ? value.items : [];
  const setItem = (i: number, item: ParamInput) =>
    onChange({ kind: 'list', items: items.map((existing, j) => (j === i ? item : existing)) });

  let body: ReactNode;
  if (param.baseType === 'tuple') {
    body = (
      <div className={classes.group}>
        {param.components.map((component, i) => (
          <div className={classes.groupItem} key={i}>
            <div className={classes.groupItemBody}>
              <AbiParamInput
                id={`${id}-${i}`}
                param={component}
                value={items[i] ?? defaultParamInput(component)}
                onChange={v => setItem(i, v)}
              />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (param.baseType === 'array') {
    const fixed = (param.arrayLength ?? -1) >= 0;
    const child = param.arrayChildren;
    body = (
      <div className={classes.group}>
        {!items.length && (
          <div className={classes.groupEmpty}>
            <Trans>No items yet.</Trans>
          </div>
        )}
        {items.map((item, i) => (
          <div className={classes.groupItem} key={i}>
            <div className={classes.groupItemBody}>
              <AbiParamInput
                id={`${id}-${i}`}
                param={child}
                value={item}
                label={`[${i}]`}
                onChange={v => setItem(i, v)}
                onRemove={
                  fixed
                    ? undefined
                    : () => onChange({ kind: 'list', items: items.filter((_, j) => j !== i) })
                }
              />
            </div>
          </div>
        ))}
        {!fixed && (
          <button
            type="button"
            className={classes.iconButton}
            onClick={() =>
              onChange({ kind: 'list', items: [...items, defaultParamInput(child)] })
            }
          >
            <PlusIcon /> <Trans>Add item</Trans>
          </button>
        )}
      </div>
    );
  } else {
    body = <LeafInput id={id} param={param} value={value} onChange={onChange} />;
  }

  return (
    <div className={classes.field}>
      <div className={classes.labelRow}>
        <label htmlFor={id}>{title}</label>
        {onRemove && (
          <button
            type="button"
            className={clsx(classes.iconButton, classes.danger)}
            onClick={onRemove}
            aria-label="Remove item"
          >
            <XIcon />
          </button>
        )}
      </div>
      {body}
    </div>
  );
};

export default AbiParamInput;
