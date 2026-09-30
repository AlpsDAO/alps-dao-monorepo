import React from 'react';
import { Trans } from '@lingui/macro';
import clsx from 'clsx';
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, TrashIcon } from '@heroicons/react/outline';
import { ProposalActionCard } from '../ProposalActionSummary';
import { CheckButton, CheckResult, useActionChecks } from './ActionCheck';
import { TEMPLATES } from './templates';
import { ActionKind, BuilderAction } from './types';
import classes from './ProposalBuilder.module.css';

/** The menu of action templates, as cards. */
export const AddActionMenu: React.FC<{ onPick: (kind: ActionKind) => void }> = ({ onPick }) => (
  <div className={classes.templateGrid}>
    {TEMPLATES.map(({ kind, title, description, icon: Icon }) => (
      <button key={kind} type="button" className={classes.templateCard} onClick={() => onPick(kind)}>
        <Icon className={classes.templateIcon} aria-hidden />
        <span>
          <span className={classes.choiceTitle}>{title}</span>
          <span className={classes.choiceDetail}>{description}</span>
        </span>
      </button>
    ))}
  </div>
);

/** The draft's actions, in order, each editable, movable and removable. */
const ActionList: React.FC<{
  actions: BuilderAction[];
  checks: ReturnType<typeof useActionChecks>;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}> = ({ actions, checks, onEdit, onRemove, onMove }) => (
  <div>
    {actions.map((action, i) => {
      const state = checks.resultFor(action.tx);
      return (
        <ProposalActionCard
          key={action.id}
          index={i}
          tx={action.tx}
          names={action.names}
          defaultOpen={false}
          actions={
            <>
              <CheckButton state={state} onClick={() => checks.check(action.tx)} />
              <button
                type="button"
                className={classes.iconButton}
                onClick={() => onMove(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                title="Move up"
              >
                <ArrowUpIcon />
              </button>
              <button
                type="button"
                className={classes.iconButton}
                onClick={() => onMove(i, 1)}
                disabled={i === actions.length - 1}
                aria-label="Move down"
                title="Move down"
              >
                <ArrowDownIcon />
              </button>
              <button
                type="button"
                className={classes.iconButton}
                onClick={() => onEdit(i)}
                title="Edit"
              >
                <PencilIcon />
                <Trans>Edit</Trans>
              </button>
              <button
                type="button"
                className={clsx(classes.iconButton, classes.danger)}
                onClick={() => onRemove(i)}
                aria-label="Remove"
                title="Remove"
              >
                <TrashIcon />
              </button>
            </>
          }
          footer={<CheckResult state={state} />}
        />
      );
    })}
  </div>
);

export default ActionList;
