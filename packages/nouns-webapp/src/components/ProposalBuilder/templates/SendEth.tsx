import React from 'react';
import { FormControl, InputGroup } from 'react-bootstrap';
import { Trans } from '@lingui/macro';
import clsx from 'clsx';
import { AddressValue, emptyAddress } from '../../../utils/proposalActions/abiInputs';
import {
  ethTransferAction,
  formatEth,
  parseAmount,
  ZERO_ADDRESS,
} from '../../../utils/proposalActions/encoding';
import { sameAddress, TREASURY_ADDRESS } from '../../../utils/proposalActions/contracts';
import { DaoSettings } from '../../../hooks/useDaoSettings';
import AddressInput from '../inputs/AddressInput';
import Field from '../inputs/Field';
import { ActionValidation } from '../types';
import { ActionTemplate, namesFor } from './types';
import classes from '../ProposalBuilder.module.css';

export interface SendEthForm {
  recipient: AddressValue;
  amount: string;
}

/** Checks shared by every "send something to someone" form. */
export const recipientError = (recipient: AddressValue) => {
  if (sameAddress(recipient.address, ZERO_ADDRESS)) {
    return <Trans>That's the zero address: anything sent there is lost for good.</Trans>;
  }
  return undefined;
};

export const recipientWarning = (recipient: AddressValue) =>
  sameAddress(recipient.address, TREASURY_ADDRESS) ? (
    <Trans>That's the treasury itself, so nothing would move.</Trans>
  ) : undefined;

const validate = (form: SendEthForm, settings?: DaoSettings): ActionValidation => {
  const errors: ActionValidation['errors'] = {};
  const warnings: React.ReactNode[] = [];
  const amount = form.amount.trim() ? parseAmount(form.amount, 18) : undefined;

  const toError = recipientError(form.recipient);
  if (toError) errors.recipient = toError;
  const toWarning = recipientWarning(form.recipient);
  if (toWarning) warnings.push(toWarning);

  if (form.amount.trim() && !amount) {
    errors.amount = <Trans>Enter an amount of ETH, like 1.5</Trans>;
  } else if (amount?.isZero()) {
    errors.amount = <Trans>Enter an amount above 0</Trans>;
  } else if (amount && settings?.treasuryEth && amount.gt(settings.treasuryEth)) {
    const held = formatEth(settings.treasuryEth, 4);
    warnings.push(
      <Trans>
        That's more than the {held} ETH the treasury holds right now. It would fail unless the
        treasury has enough by the time the proposal executes.
      </Trans>,
    );
  }

  const tx =
    form.recipient.address && amount && !amount.isZero() && !Object.keys(errors).length
      ? ethTransferAction(form.recipient.address, amount)
      : undefined;
  return { tx, errors, warnings, names: namesFor(form.recipient) };
};

const SendEthFormView: ActionTemplate<SendEthForm>['Form'] = ({
  form,
  onChange,
  validation,
  settings,
}) => {
  const held = settings?.treasuryEth ? formatEth(settings.treasuryEth, 4) : undefined;
  return (
    <>
      <Field label={<Trans>Recipient</Trans>} htmlFor="send-eth-to" error={validation.errors.recipient}>
        <AddressInput
          id="send-eth-to"
          value={form.recipient}
          onChange={recipient => onChange({ ...form, recipient })}
        />
      </Field>
      <Field
        label={<Trans>Amount</Trans>}
        htmlFor="send-eth-amount"
        current={
          held && (
            <Trans>
              Treasury holds <strong>{held} ETH</strong>
            </Trans>
          )
        }
        error={validation.errors.amount}
      >
        <InputGroup className={classes.inputGroup}>
          <FormControl
            id="send-eth-amount"
            className={clsx(classes.input)}
            value={form.amount}
            inputMode="decimal"
            placeholder="0.0"
            autoComplete="off"
            onChange={e => onChange({ ...form, amount: e.target.value })}
          />
          <InputGroup.Text className={classes.unit}>ETH</InputGroup.Text>
        </InputGroup>
      </Field>
    </>
  );
};

/** The ether diamond, drawn like the outline icons beside it */
const EthIcon: React.FC<React.ComponentProps<'svg'>> = props => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" {...props}>
    <path d="M12 2.5 5.75 12.6 12 16.2l6.25-3.6L12 2.5z" />
    <path d="M5.75 14 12 21.5l6.25-7.5L12 17.6 5.75 14z" />
  </svg>
);

const sendEth: ActionTemplate<SendEthForm> = {
  kind: 'send-eth',
  title: <Trans>Send ETH</Trans>,
  description: <Trans>Pay someone from the treasury</Trans>,
  icon: EthIcon,
  initialForm: () => ({ recipient: emptyAddress(), amount: '' }),
  validate,
  Form: SendEthFormView,
};

export default sendEth;
