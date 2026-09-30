import React, { ReactNode } from 'react';
import { FormControl, InputGroup } from 'react-bootstrap';
import { Trans } from '@lingui/macro';
import { i18n } from '@lingui/core';
import { ScaleIcon } from '@heroicons/react/outline';
import clsx from 'clsx';
import config from '../../../config';
import { DaoSettings } from '../../../hooks/useDaoSettings';
import { functionAction, parseInteger } from '../../../utils/proposalActions/encoding';
import { GOVERNOR_LIMITS } from '../../../utils/proposalActions/contracts';
import { BlocksDuration } from '../../ProposalActionSummary';
import Field from '../inputs/Field';
import { ActionValidation } from '../types';
import { ActionTemplate } from './types';
import classes from '../ProposalBuilder.module.css';

export type GovernorSetting = keyof typeof GOVERNOR_LIMITS;

export interface GovernorForm {
  setting?: GovernorSetting;
  value: string;
}

const SIGNATURES: Record<GovernorSetting, string> = {
  votingDelay: '_setVotingDelay(uint256)',
  votingPeriod: '_setVotingPeriod(uint256)',
  proposalThresholdBPS: '_setProposalThresholdBPS(uint256)',
  quorumVotesBPS: '_setQuorumVotesBPS(uint256)',
};

/** What the governor's bps2Uint gives: a share of the supply, rounded down */
const shareOfSupply = (bps: number, supply: number) => Math.floor((supply * bps) / 10_000);

const isBlocks = (setting: GovernorSetting) => setting === 'votingDelay' || setting === 'votingPeriod';

const currentValue = (setting: GovernorSetting, settings?: DaoSettings) => settings?.[setting];

const validate = (form: GovernorForm, settings?: DaoSettings): ActionValidation => {
  const errors: ActionValidation['errors'] = {};
  const warnings: ReactNode[] = [];
  if (!form.setting) return { errors };
  const { min, max } = GOVERNOR_LIMITS[form.setting];
  const text = form.value.trim();
  const value = text ? parseInteger(text) : undefined;

  if (text && !value) {
    errors.value = <Trans>Enter a whole number</Trans>;
  } else if (value && (value.lt(min) || value.gt(max))) {
    const minText = i18n.number(min);
    const maxText = i18n.number(max);
    errors.value = (
      <Trans>
        The governor only accepts {minText} to {maxText}
      </Trans>
    );
  }
  if (!value || errors.value) return { errors };

  if (value.eq(currentValue(form.setting, settings) ?? -1)) {
    warnings.push(<Trans>That's already the current value.</Trans>);
  }
  return {
    tx: functionAction(config.addresses.alpsDAOProxy, SIGNATURES[form.setting], [value]),
    errors,
    warnings,
  };
};

const BpsMeaning: React.FC<{ setting: GovernorSetting; bps: number; supply?: number }> = ({
  setting,
  bps,
  supply,
}) => {
  const percent = `${bps / 100}%`;
  if (supply === undefined) {
    return <Trans>{percent} of all Alps.</Trans>;
  }
  const votes = shareOfSupply(bps, supply);
  const supplyText = i18n.number(supply);
  if (setting === 'proposalThresholdBPS') {
    const needed = votes + 1;
    return (
      <Trans>
        {percent} of all Alps. With {supplyText} Alps today, proposers would need at least {needed}{' '}
        votes.
      </Trans>
    );
  }
  return (
    <Trans>
      {percent} of all Alps. With {supplyText} Alps today, a proposal would need at least {votes}{' '}
      votes for it to pass.
    </Trans>
  );
};

const GovernorFormView: ActionTemplate<GovernorForm>['Form'] = ({
  form,
  onChange,
  validation,
  settings,
}) => {
  const supply = settings?.totalSupply;
  const current = (setting: GovernorSetting) => {
    const value = currentValue(setting, settings);
    if (value === undefined) return undefined;
    const formatted = i18n.number(value);
    if (isBlocks(setting)) {
      return (
        <Trans>
          Now {formatted} blocks (about <BlocksDuration blocks={value} />)
        </Trans>
      );
    }
    const percent = `${value / 100}%`;
    return (
      <Trans>
        Now {formatted} basis points ({percent})
      </Trans>
    );
  };

  const options: Array<{ setting: GovernorSetting; title: ReactNode }> = [
    { setting: 'votingDelay', title: <Trans>Voting delay</Trans> },
    { setting: 'votingPeriod', title: <Trans>Voting period</Trans> },
    { setting: 'proposalThresholdBPS', title: <Trans>Proposal threshold</Trans> },
    { setting: 'quorumVotesBPS', title: <Trans>Quorum</Trans> },
  ];

  const setting = form.setting;
  const parsed = form.value.trim() ? parseInteger(form.value) : undefined;
  const entered = parsed && !validation.errors.value ? parsed.toNumber() : undefined;
  const limits = setting ? GOVERNOR_LIMITS[setting] : undefined;
  const minText = limits && i18n.number(limits.min);
  const maxText = limits && i18n.number(limits.max);

  let explanation: ReactNode = null;
  switch (setting) {
    case 'votingDelay':
      explanation = (
        <Trans>
          How long after a proposal is submitted voting opens, in blocks (a block is about 12
          seconds). Between {minText} and {maxText} blocks.
        </Trans>
      );
      break;
    case 'votingPeriod':
      explanation = (
        <Trans>
          How long voting stays open, in blocks (a block is about 12 seconds). Between {minText} and{' '}
          {maxText} blocks.
        </Trans>
      );
      break;
    case 'proposalThresholdBPS':
      explanation = (
        <Trans>
          The share of all Alps someone needs to submit a proposal, in basis points: 100 basis
          points is 1%. Between {minText} and {maxText}.
        </Trans>
      );
      break;
    case 'quorumVotesBPS':
      explanation = (
        <Trans>
          The share of all Alps that must vote for a proposal for it to pass, in basis points: 100
          basis points is 1%. Each proposal keeps the quorum it was submitted with. Between{' '}
          {minText} and {maxText}.
        </Trans>
      );
      break;
  }

  return (
    <>
      <Field label={<Trans>What to change</Trans>}>
        <div className={classes.choices}>
          {options.map(option => (
            <button
              key={option.setting}
              type="button"
              className={clsx(classes.choice, setting === option.setting && classes.selected)}
              aria-pressed={setting === option.setting}
              onClick={() => onChange({ setting: option.setting, value: '' })}
            >
              <span className={classes.choiceTitle}>{option.title}</span>
              <span className={classes.choiceDetail}>{current(option.setting)}</span>
            </button>
          ))}
        </div>
      </Field>

      {setting && (
        <Field
          label={<Trans>New value</Trans>}
          htmlFor="governor-value"
          current={current(setting)}
          error={validation.errors.value}
          hint={
            <>
              {entered !== undefined &&
                (isBlocks(setting) ? (
                  <>
                    <Trans>
                      About <BlocksDuration blocks={entered} />.
                    </Trans>{' '}
                  </>
                ) : (
                  <>
                    <BpsMeaning setting={setting} bps={entered} supply={supply} />{' '}
                  </>
                ))}
              {explanation}
            </>
          }
        >
          <InputGroup className={classes.inputGroup}>
            <FormControl
              id="governor-value"
              className={classes.input}
              value={form.value}
              inputMode="numeric"
              autoComplete="off"
              onChange={e => onChange({ ...form, value: e.target.value })}
            />
            <InputGroup.Text className={classes.unit}>
              {isBlocks(setting) ? <Trans>blocks</Trans> : <Trans>basis points</Trans>}
            </InputGroup.Text>
          </InputGroup>
        </Field>
      )}
    </>
  );
};

const governorSettings: ActionTemplate<GovernorForm> = {
  kind: 'governor',
  title: <Trans>Governance settings</Trans>,
  description: <Trans>Voting delay and period, proposal threshold, quorum</Trans>,
  icon: ScaleIcon,
  initialForm: () => ({ value: '' }),
  validate,
  Form: GovernorFormView,
};

export default governorSettings;
