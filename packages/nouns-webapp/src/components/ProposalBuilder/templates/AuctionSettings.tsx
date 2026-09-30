import React, { ReactNode } from 'react';
import { FormControl, InputGroup } from 'react-bootstrap';
import { BigNumber } from 'ethers';
import { Trans } from '@lingui/macro';
import { AdjustmentsIcon } from '@heroicons/react/outline';
import clsx from 'clsx';
import config from '../../../config';
import { DaoSettings } from '../../../hooks/useDaoSettings';
import {
  formatEth,
  functionAction,
  parseAmount,
  parseInteger,
} from '../../../utils/proposalActions/encoding';
import { Duration } from '../../ProposalActionSummary';
import Field from '../inputs/Field';
import { ActionValidation } from '../types';
import { ActionTemplate } from './types';
import classes from '../ProposalBuilder.module.css';

export type AuctionSetting =
  | 'reservePrice'
  | 'timeBuffer'
  | 'minBidIncrementPercentage'
  | 'pause'
  | 'unpause';

export interface AuctionForm {
  setting?: AuctionSetting;
  value: string;
}

const parseValue = (form: AuctionForm): BigNumber | undefined => {
  const text = form.value.trim();
  if (!text) return undefined;
  switch (form.setting) {
    case 'reservePrice':
      return parseAmount(text, 18);
    case 'timeBuffer': {
      const n = parseInteger(text);
      return n && !n.isNegative() ? n : undefined;
    }
    case 'minBidIncrementPercentage': {
      const n = parseInteger(text);
      return n && !n.isNegative() && n.lte(255) ? n : undefined;
    }
    default:
      return undefined;
  }
};

const validate = (form: AuctionForm, settings?: DaoSettings): ActionValidation => {
  const errors: ActionValidation['errors'] = {};
  const warnings: ReactNode[] = [];
  const auctionHouse = config.addresses.alpsAuctionHouseProxy;

  if (form.setting === 'pause' || form.setting === 'unpause') {
    if (form.setting === 'pause' && settings?.auctionPaused === true) {
      warnings.push(
        <Trans>
          Auctions are already paused, so this would fail unless they're resumed before the
          proposal executes.
        </Trans>,
      );
    }
    if (form.setting === 'unpause' && settings?.auctionPaused === false) {
      warnings.push(
        <Trans>
          Auctions are already running, so this would fail unless they're paused before the
          proposal executes.
        </Trans>,
      );
    }
    return { tx: functionAction(auctionHouse, `${form.setting}()`, []), errors, warnings };
  }
  if (!form.setting) return { errors };

  const value = parseValue(form);
  if (form.value.trim() && !value) {
    errors.value =
      form.setting === 'reservePrice' ? (
        <Trans>Enter an amount of ETH, like 0.1</Trans>
      ) : form.setting === 'timeBuffer' ? (
        <Trans>Enter a whole number of seconds</Trans>
      ) : (
        <Trans>Enter a whole percentage from 0 to 255</Trans>
      );
  }
  if (!value) return { errors };

  const current =
    form.setting === 'reservePrice'
      ? settings?.reservePrice
      : form.setting === 'timeBuffer'
      ? settings?.timeBuffer
      : settings?.minBidIncrementPercentage;
  if (current !== undefined && value.eq(current)) {
    warnings.push(<Trans>That's already the current value.</Trans>);
  }
  if (form.setting === 'minBidIncrementPercentage' && value.isZero()) {
    warnings.push(<Trans>At 0%, a new bid only has to beat the last one by 1 wei.</Trans>);
  }
  if (
    form.setting === 'timeBuffer' &&
    settings?.auctionDuration !== undefined &&
    value.gt(settings.auctionDuration)
  ) {
    warnings.push(<Trans>That's longer than a whole auction.</Trans>);
  }

  const signature = {
    reservePrice: 'setReservePrice(uint256)',
    timeBuffer: 'setTimeBuffer(uint256)',
    minBidIncrementPercentage: 'setMinBidIncrementPercentage(uint8)',
  }[form.setting];
  return { tx: functionAction(auctionHouse, signature, [value]), errors, warnings };
};

const AuctionFormView: ActionTemplate<AuctionForm>['Form'] = ({
  form,
  onChange,
  validation,
  settings,
}) => {
  const reserve = settings?.reservePrice ? formatEth(settings.reservePrice) : undefined;
  const buffer = settings?.timeBuffer;
  const increment = settings?.minBidIncrementPercentage;
  const paused = settings?.auctionPaused;

  const options: Array<{ setting: AuctionSetting; title: ReactNode; current?: ReactNode }> = [
    {
      setting: 'reservePrice',
      title: <Trans>Reserve price</Trans>,
      current: reserve !== undefined && <Trans>Now {reserve} ETH</Trans>,
    },
    {
      setting: 'timeBuffer',
      title: <Trans>Time buffer</Trans>,
      current: buffer !== undefined && (
        <Trans>
          Now <Duration seconds={buffer} />
        </Trans>
      ),
    },
    {
      setting: 'minBidIncrementPercentage',
      title: <Trans>Minimum bid increase</Trans>,
      current: increment !== undefined && <Trans>Now {increment}%</Trans>,
    },
    {
      setting: 'pause',
      title: <Trans>Pause auctions</Trans>,
      current: paused !== undefined && (paused ? <Trans>Paused now</Trans> : <Trans>Running now</Trans>),
    },
    {
      setting: 'unpause',
      title: <Trans>Resume auctions</Trans>,
      current: paused !== undefined && (paused ? <Trans>Paused now</Trans> : <Trans>Running now</Trans>),
    },
  ];

  const seconds = form.setting === 'timeBuffer' ? parseValue(form) : undefined;

  return (
    <>
      <Field label={<Trans>What to change</Trans>}>
        <div className={classes.choices}>
          {options.map(option => (
            <button
              key={option.setting}
              type="button"
              className={clsx(classes.choice, form.setting === option.setting && classes.selected)}
              aria-pressed={form.setting === option.setting}
              onClick={() => onChange({ setting: option.setting, value: '' })}
            >
              <span className={classes.choiceTitle}>{option.title}</span>
              {option.current && <span className={classes.choiceDetail}>{option.current}</span>}
            </button>
          ))}
        </div>
      </Field>

      {form.setting === 'reservePrice' && (
        <Field
          label={<Trans>New reserve price</Trans>}
          htmlFor="auction-value"
          current={reserve !== undefined && <Trans>Now <strong>{reserve} ETH</strong></Trans>}
          error={validation.errors.value}
          hint={<Trans>The lowest first bid an auction accepts.</Trans>}
        >
          <InputGroup className={classes.inputGroup}>
            <FormControl
              id="auction-value"
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
      )}

      {form.setting === 'timeBuffer' && (
        <Field
          label={<Trans>New time buffer</Trans>}
          htmlFor="auction-value"
          current={
            buffer !== undefined && (
              <Trans>
                Now <strong>{buffer} seconds</strong>
              </Trans>
            )
          }
          error={validation.errors.value}
          hint={
            <>
              {seconds && seconds.gt(0) && (
                <>
                  = <Duration seconds={seconds.toNumber()} />.{' '}
                </>
              )}
              <Trans>
                A bid in an auction's last moments extends it, so it can't end less than this long
                after the latest bid.
              </Trans>
            </>
          }
        >
          <InputGroup className={classes.inputGroup}>
            <FormControl
              id="auction-value"
              className={classes.input}
              value={form.value}
              inputMode="numeric"
              placeholder="300"
              autoComplete="off"
              onChange={e => onChange({ ...form, value: e.target.value })}
            />
            <InputGroup.Text className={classes.unit}>
              <Trans>seconds</Trans>
            </InputGroup.Text>
          </InputGroup>
        </Field>
      )}

      {form.setting === 'minBidIncrementPercentage' && (
        <Field
          label={<Trans>New minimum bid increase</Trans>}
          htmlFor="auction-value"
          current={increment !== undefined && <Trans>Now <strong>{increment}%</strong></Trans>}
          error={validation.errors.value}
          hint={<Trans>How much each bid has to beat the one before it by.</Trans>}
        >
          <InputGroup className={classes.inputGroup}>
            <FormControl
              id="auction-value"
              className={classes.input}
              value={form.value}
              inputMode="numeric"
              placeholder="5"
              autoComplete="off"
              onChange={e => onChange({ ...form, value: e.target.value })}
            />
            <InputGroup.Text className={classes.unit}>%</InputGroup.Text>
          </InputGroup>
        </Field>
      )}

      {form.setting === 'pause' && (
        <p className={classes.hint}>
          <Trans>
            No new auctions start while paused. An auction that's already running can still be
            bid on, and settled once it ends.
          </Trans>
        </p>
      )}
      {form.setting === 'unpause' && (
        <p className={classes.hint}>
          <Trans>Auctions start again, beginning with a new one if none is running.</Trans>
        </p>
      )}
    </>
  );
};

const auctionSettings: ActionTemplate<AuctionForm> = {
  kind: 'auction',
  title: <Trans>Auction settings</Trans>,
  description: <Trans>Reserve price, time buffer, minimum bid, pause or resume</Trans>,
  icon: AdjustmentsIcon,
  initialForm: () => ({ value: '' }),
  validate,
  Form: AuctionFormView,
};

export default auctionSettings;
