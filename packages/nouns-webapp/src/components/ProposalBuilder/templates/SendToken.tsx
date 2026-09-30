import React, { useEffect } from 'react';
import { FormControl, InputGroup } from 'react-bootstrap';
import { utils } from 'ethers';
import { Trans } from '@lingui/macro';
import { CashIcon } from '@heroicons/react/outline';
import clsx from 'clsx';
import { AddressValue, emptyAddress } from '../../../utils/proposalActions/abiInputs';
import {
  formatUnitsReadable,
  functionAction,
  parseAmount,
} from '../../../utils/proposalActions/encoding';
import { knownToken, knownTokens, sameAddress, TokenInfo } from '../../../utils/proposalActions/contracts';
import { useTokenInfo, useTreasuryTokenBalance } from '../../../hooks/useTokenInfo';
import AddressInput from '../inputs/AddressInput';
import Field, { Warning } from '../inputs/Field';
import { ActionValidation } from '../types';
import { ActionTemplate, namesFor } from './types';
import { recipientError, recipientWarning } from './SendEth';
import classes from '../ProposalBuilder.module.css';

export interface SendTokenForm {
  /** A known token's address, or 'custom' */
  tokenChoice: string;
  custom: AddressValue;
  /** Symbol and decimals of the custom token, once read */
  tokenInfo?: TokenInfo;
  recipient: AddressValue;
  amount: string;
}

const selectedToken = (form: SendTokenForm) => {
  const address = form.tokenChoice === 'custom' ? form.custom.address : form.tokenChoice || undefined;
  const info =
    knownToken(address) ?? (sameAddress(form.tokenInfo?.address, address) ? form.tokenInfo : undefined);
  return { address, info };
};

const validate = (form: SendTokenForm): ActionValidation => {
  const errors: ActionValidation['errors'] = {};
  const warnings: React.ReactNode[] = [];
  const { address, info } = selectedToken(form);
  const amount = info && form.amount.trim() ? parseAmount(form.amount, info.decimals) : undefined;

  const toError = recipientError(form.recipient);
  if (toError) errors.recipient = toError;
  const toWarning = recipientWarning(form.recipient);
  if (toWarning) warnings.push(toWarning);

  if (info && form.amount.trim() && !amount) {
    const { symbol, decimals } = info;
    errors.amount = (
      <Trans>
        Enter an amount of {symbol}, with at most {decimals} decimals
      </Trans>
    );
  } else if (amount?.isZero()) {
    errors.amount = <Trans>Enter an amount above 0</Trans>;
  }

  const tx =
    address && info && form.recipient.address && amount && !amount.isZero() && !errors.recipient
      ? functionAction(address, 'transfer(address,uint256)', [form.recipient.address, amount])
      : undefined;
  return { tx, errors, warnings, names: namesFor(form.recipient) };
};

const SendTokenFormView: ActionTemplate<SendTokenForm>['Form'] = ({ form, onChange, validation }) => {
  const tokens = knownTokens();
  const { address, info } = selectedToken(form);
  const custom = useTokenInfo(form.tokenChoice === 'custom' ? form.custom.address : undefined);
  const balance = useTreasuryTokenBalance(info ? address : undefined);

  // Keep what we read about a custom token in the form, so it survives in the draft
  useEffect(() => {
    if (custom.info && !sameAddress(custom.info.address, form.tokenInfo?.address)) {
      onChange({ ...form, tokenInfo: custom.info });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custom.info]);

  const amount = info && form.amount.trim() ? parseAmount(form.amount, info.decimals) : undefined;
  const held = info && balance ? formatUnitsReadable(balance, info.decimals, 6) : undefined;
  const symbol = info?.symbol;

  return (
    <>
      <Field label={<Trans>Token</Trans>}>
        <div className={classes.chips}>
          {tokens.map(token => (
            <button
              key={token.address}
              type="button"
              className={clsx(classes.chip, sameAddress(form.tokenChoice, token.address) && classes.selected)}
              aria-pressed={sameAddress(form.tokenChoice, token.address)}
              onClick={() => onChange({ ...form, tokenChoice: token.address })}
            >
              {token.symbol}
            </button>
          ))}
          <button
            type="button"
            className={clsx(classes.chip, form.tokenChoice === 'custom' && classes.selected)}
            aria-pressed={form.tokenChoice === 'custom'}
            onClick={() => onChange({ ...form, tokenChoice: 'custom' })}
          >
            <Trans>Another token</Trans>
          </button>
        </div>
      </Field>
      {form.tokenChoice === 'custom' && (
        <Field label={<Trans>Token contract</Trans>} htmlFor="send-token-contract">
          <AddressInput
            id="send-token-contract"
            value={form.custom}
            onChange={value => onChange({ ...form, custom: value })}
            placeholder="0x… token contract address"
          />
          {form.custom.address && custom.loading && (
            <div className={classes.pending}>
              <Trans>Reading the token…</Trans>
            </div>
          )}
          {form.custom.address && !custom.loading && !info && (
            <div className={classes.error}>
              <Trans>Couldn't read an ERC-20 token at this address.</Trans>
            </div>
          )}
          {form.custom.address && info && (
            <div className={classes.hint}>
              <Trans>
                {info.symbol}, {info.decimals} decimals
              </Trans>
            </div>
          )}
        </Field>
      )}
      <Field label={<Trans>Recipient</Trans>} htmlFor="send-token-to" error={validation.errors.recipient}>
        <AddressInput
          id="send-token-to"
          value={form.recipient}
          onChange={recipient => onChange({ ...form, recipient })}
        />
      </Field>
      <Field
        label={<Trans>Amount</Trans>}
        htmlFor="send-token-amount"
        current={
          held !== undefined && (
            <>
              <Trans>
                Treasury holds{' '}
                <strong>
                  {held} {symbol}
                </strong>
              </Trans>{' '}
              {info && balance && !balance.isZero() && (
                <button
                  type="button"
                  className={classes.linkButton}
                  onClick={() =>
                    onChange({ ...form, amount: utils.formatUnits(balance, info.decimals) })
                  }
                >
                  <Trans>Send all</Trans>
                </button>
              )}
            </>
          )
        }
        error={validation.errors.amount}
      >
        <InputGroup className={classes.inputGroup}>
          <FormControl
            id="send-token-amount"
            className={classes.input}
            value={form.amount}
            inputMode="decimal"
            placeholder="0.0"
            autoComplete="off"
            disabled={!info}
            onChange={e => onChange({ ...form, amount: e.target.value })}
          />
          <InputGroup.Text className={classes.unit}>{symbol ?? '—'}</InputGroup.Text>
        </InputGroup>
      </Field>
      {amount && balance && amount.gt(balance) && (
        <Warning>
          <Trans>
            That's more than the treasury holds right now. It would fail unless the treasury has
            enough by the time the proposal executes.
          </Trans>
        </Warning>
      )}
    </>
  );
};

const sendToken: ActionTemplate<SendTokenForm> = {
  kind: 'send-token',
  title: <Trans>Send tokens</Trans>,
  description: <Trans>WETH, USDC, stETH or any ERC-20 the treasury holds</Trans>,
  icon: CashIcon,
  initialForm: () => ({ tokenChoice: '', custom: emptyAddress(), recipient: emptyAddress(), amount: '' }),
  validate,
  Form: SendTokenFormView,
};

export default sendToken;
