import React, { ReactNode } from 'react';
import { FormControl, InputGroup } from 'react-bootstrap';
import { Trans } from '@lingui/macro';
import { i18n } from '@lingui/core';
import { ClockIcon } from '@heroicons/react/outline';
import { DaoSettings } from '../../../hooks/useDaoSettings';
import { cleanDecimal, functionAction } from '../../../utils/proposalActions/encoding';
import { TIMELOCK_DELAY_LIMITS, TREASURY_ADDRESS } from '../../../utils/proposalActions/contracts';
import { Duration } from '../../ProposalActionSummary';
import Field from '../inputs/Field';
import { ActionValidation } from '../types';
import { ActionTemplate } from './types';
import classes from '../ProposalBuilder.module.css';

export interface TreasuryDelayForm {
  days: string;
}

const DAY = 24 * 60 * 60;

const secondsFor = (form: TreasuryDelayForm) => {
  const cleaned = cleanDecimal(form.days);
  return cleaned === undefined ? undefined : Math.round(parseFloat(cleaned) * DAY);
};

const validate = (form: TreasuryDelayForm, settings?: DaoSettings): ActionValidation => {
  const errors: ActionValidation['errors'] = {};
  const warnings: ReactNode[] = [];
  if (!form.days.trim()) return { errors };
  const seconds = secondsFor(form);
  if (seconds === undefined) {
    errors.days = <Trans>Enter a number of days, like 2 or 2.5</Trans>;
    return { errors };
  }
  if (seconds < TIMELOCK_DELAY_LIMITS.min || seconds > TIMELOCK_DELAY_LIMITS.max) {
    errors.days = <Trans>The treasury only accepts 2 to 30 days</Trans>;
    return { errors };
  }
  if (seconds === settings?.timelockDelay) {
    warnings.push(<Trans>That's already the current delay.</Trans>);
  }
  return {
    tx: functionAction(TREASURY_ADDRESS, 'setDelay(uint256)', [seconds]),
    errors,
    warnings,
  };
};

const TreasuryDelayFormView: ActionTemplate<TreasuryDelayForm>['Form'] = ({
  form,
  onChange,
  validation,
  settings,
}) => {
  const current = settings?.timelockDelay;
  const seconds = secondsFor(form);
  const secondsText = seconds !== undefined ? i18n.number(seconds) : undefined;
  return (
    <Field
      label={<Trans>New delay</Trans>}
      htmlFor="treasury-delay"
      current={
        current !== undefined && (
          <Trans>
            Now{' '}
            <strong>
              <Duration seconds={current} />
            </strong>
          </Trans>
        )
      }
      error={validation.errors.days}
      hint={
        <>
          {seconds !== undefined && !validation.errors.days && (
            <>
              <Trans>= {secondsText} seconds.</Trans>{' '}
            </>
          )}
          <Trans>
            How long a proposal waits in the treasury after it passes before anyone can execute it,
            giving everyone time to react. Between 2 and 30 days. Proposals already queued keep
            their timing.
          </Trans>
        </>
      }
    >
      <InputGroup className={classes.inputGroup}>
        <FormControl
          id="treasury-delay"
          className={classes.input}
          value={form.days}
          inputMode="decimal"
          placeholder="2"
          autoComplete="off"
          onChange={e => onChange({ days: e.target.value })}
        />
        <InputGroup.Text className={classes.unit}>
          <Trans>days</Trans>
        </InputGroup.Text>
      </InputGroup>
    </Field>
  );
};

const treasuryDelay: ActionTemplate<TreasuryDelayForm> = {
  kind: 'treasury-delay',
  title: <Trans>Treasury delay</Trans>,
  description: <Trans>How long passed proposals wait before they can execute</Trans>,
  icon: ClockIcon,
  initialForm: () => ({ days: '' }),
  validate,
  Form: TreasuryDelayFormView,
};

export default treasuryDelay;
