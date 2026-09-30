import React, { ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Button, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Trans } from '@lingui/macro';
import clsx from 'clsx';
import { ExclamationCircleIcon, PlusIcon } from '@heroicons/react/outline';
import Section from '../../layout/Section';
import { WalletContext } from '../../contexts/WalletContext';
import { useDaoSettings } from '../../hooks/useDaoSettings';
import { useProposerEligibility } from '../../hooks/useProposerEligibility';
import {
  duplicateActionIndexes,
  formatEth,
  totalValue,
} from '../../utils/proposalActions/encoding';
import { MAX_PROPOSAL_ACTIONS } from '../../utils/proposalActions/contracts';
import { BlocksDuration } from '../../components/ProposalActionSummary';
import ProposalTextEditor from '../../components/ProposalBuilder/ProposalTextEditor';
import ActionList, { AddActionMenu } from '../../components/ProposalBuilder/ActionList';
import ActionEditorModal from '../../components/ProposalBuilder/ActionEditorModal';
import EligibilityNotice from '../../components/ProposalBuilder/EligibilityNotice';
import ReviewStep from '../../components/ProposalBuilder/ReviewStep';
import { useActionChecks } from '../../components/ProposalBuilder/ActionCheck';
import {
  clearDraft,
  emptyDraft,
  loadDraft,
  ProposalDraft,
  saveDraft,
} from '../../components/ProposalBuilder/draft';
import { ActionKind, BuilderAction } from '../../components/ProposalBuilder/types';
import builder from '../../components/ProposalBuilder/ProposalBuilder.module.css';
import classes from './CreateProposal.module.css';

type Mode = 'edit' | 'review';

const Steps: React.FC<{ mode: Mode }> = ({ mode }) => (
  <ol className={classes.steps}>
    <li className={clsx(mode === 'edit' && classes.currentStep)}>
      <span>1</span>
      <Trans>Write</Trans>
    </li>
    <li className={clsx(mode === 'review' && classes.currentStep)}>
      <span>2</span>
      <Trans>Review and submit</Trans>
    </li>
  </ol>
);

const CreateProposalPage = () => {
  const { account } = useContext(WalletContext);
  const eligibility = useProposerEligibility(account);
  const settings = useDaoSettings();
  const checks = useActionChecks();

  const [draft, setDraft] = useState<ProposalDraft>(loadDraft);
  const [mode, setMode] = useState<Mode>('edit');
  const [editor, setEditor] = useState<{ kind: ActionKind; index?: number }>();
  const [showMenu, setShowMenu] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [submitted, setSubmitted] = useState<{ id?: number }>();

  useEffect(() => {
    if (!submitted) saveDraft(draft);
  }, [draft, submitted]);

  const { title, body, actions } = draft;
  const txs = actions.map(a => a.tx);
  const total = totalValue(txs);
  const duplicates = duplicateActionIndexes(txs);
  const hasContent = !!(title || body || actions.length);

  const update = (changes: Partial<ProposalDraft>) => setDraft(d => ({ ...d, ...changes }));
  const setActions = (next: BuilderAction[]) => update({ actions: next });

  const goTo = (next: Mode) => {
    setMode(next);
    window.scrollTo({ top: 0 });
  };

  const saveAction = (action: BuilderAction) => {
    const index = editor?.index;
    setActions(
      index === undefined
        ? [...actions, action]
        : actions.map((existing, i) => (i === index ? action : existing)),
    );
    setEditor(undefined);
    setShowMenu(false);
  };

  const moveAction = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= actions.length) return;
    const next = [...actions];
    [next[index], next[target]] = [next[target], next[index]];
    setActions(next);
  };

  const startOver = () => {
    clearDraft();
    setDraft(emptyDraft());
    setConfirmReset(false);
    setShowMenu(false);
    setSubmitted(undefined);
    goTo('edit');
  };

  const onSubmitted = useCallback((id?: number) => {
    clearDraft();
    setSubmitted({ id });
    window.scrollTo({ top: 0 });
  }, []);

  const blockers: ReactNode[] = [];
  if (!title.trim()) blockers.push(<Trans>Give the proposal a title.</Trans>);
  if (!body.trim()) blockers.push(<Trans>Write a description.</Trans>);
  if (!actions.length) blockers.push(<Trans>Add at least one action.</Trans>);
  if (actions.length > MAX_PROPOSAL_ACTIONS) {
    blockers.push(<Trans>A proposal can have at most 10 actions. Remove some, or split it in two.</Trans>);
  }
  const duplicateBlockers = duplicates.map(([first, second]) => {
    const a = first + 1;
    const b = second + 1;
    return (
      <Trans>
        Actions {a} and {b} are identical, and the governor can't queue two identical actions.
        Change or remove one.
      </Trans>
    );
  });
  blockers.push(...duplicateBlockers);

  const warnings: ReactNode[] = [];
  if (settings?.treasuryEth && total.gt(settings.treasuryEth)) {
    const sending = formatEth(total, 4);
    const held = formatEth(settings.treasuryEth, 4);
    warnings.push(
      <Trans>
        This proposal sends {sending} ETH, more than the {held} ETH the treasury holds right now.
      </Trans>,
    );
  }

  const header = (
    <>
      <Link to="/vote" className={classes.backLink}>
        ← <Trans>All proposals</Trans>
      </Link>
      <div className={classes.headerRow}>
        <div>
          <span>
            <Trans>Governance</Trans>
          </span>
          <h1>
            <Trans>New proposal</Trans>
          </h1>
        </div>
        {hasContent && !submitted && mode === 'edit' && (
          <div className={classes.startOver}>
            {confirmReset ? (
              <>
                <span>
                  <Trans>Clear the title, description and every action?</Trans>
                </span>
                <button type="button" className={builder.linkButton} onClick={startOver}>
                  <Trans>Clear everything</Trans>
                </button>
                <button
                  type="button"
                  className={builder.linkButton}
                  onClick={() => setConfirmReset(false)}
                >
                  <Trans>Keep it</Trans>
                </button>
              </>
            ) : (
              <button type="button" className={builder.linkButton} onClick={() => setConfirmReset(true)}>
                <Trans>Start over</Trans>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (submitted) {
    const id = submitted.id;
    return (
      <Section fullWidth={false} className={classes.createProposalPage}>
        <Col lg={10} className={classes.wrapper}>
          {header}
          <section className={clsx(builder.card, classes.success)}>
            <h2 className={builder.cardTitle}>
              {id ? <Trans>Prop {id} is submitted</Trans> : <Trans>Your proposal is submitted</Trans>}
            </h2>
            <p className={builder.cardIntro}>
              {settings?.votingDelay ? (
                <Trans>
                  Voting opens in about <BlocksDuration blocks={settings.votingDelay} />. Let the club
                  know it's coming, so members have time to read it and ask questions.
                </Trans>
              ) : (
                <Trans>Let the club know it's coming, so members have time to read it.</Trans>
              )}
            </p>
            <div className={classes.successButtons}>
              {id ? (
                <Link to={`/vote/${id}`} className={clsx('btn', builder.primaryButton)}>
                  <Trans>View Prop {id}</Trans>
                </Link>
              ) : (
                <Link to="/vote" className={clsx('btn', builder.primaryButton)}>
                  <Trans>See all proposals</Trans>
                </Link>
              )}
              <Button className={builder.secondaryButton} onClick={startOver}>
                <Trans>Write another</Trans>
              </Button>
            </div>
          </section>
        </Col>
      </Section>
    );
  }

  const atLimit = actions.length >= MAX_PROPOSAL_ACTIONS;
  const menuOpen = !atLimit && (showMenu || !actions.length);

  return (
    <Section fullWidth={false} className={classes.createProposalPage}>
      <Col lg={10} className={classes.wrapper}>
        {header}
        <Steps mode={mode} />
        {mode === 'edit' && (
          <p className={classes.intro}>
            <Trans>
              A proposal asks the club to approve actions that the treasury then carries out:
              payments, setting changes, any contract call. Say what you want and why, add the
              actions, then review and submit. Your draft is saved in this browser as you go.
            </Trans>
          </p>
        )}
        <EligibilityNotice account={account} eligibility={eligibility} />

        {mode === 'review' ? (
          <ReviewStep
            title={title}
            body={body}
            actions={actions}
            account={account}
            eligibility={eligibility}
            settings={settings}
            blockers={blockers}
            warnings={warnings}
            onBack={() => goTo('edit')}
            onSubmitted={onSubmitted}
          />
        ) : (
          <>
            <section className={builder.card}>
              <h2 className={builder.cardTitle}>
                <Trans>Describe it</Trans>
              </h2>
              <p className={builder.cardIntro}>
                <Trans>
                  Members vote on what they read here: say what the proposal does, why it's good
                  for the club, and what it costs.
                </Trans>
              </p>
              <ProposalTextEditor
                title={title}
                body={body}
                onTitleChange={value => update({ title: value })}
                onBodyChange={value => update({ body: value })}
              />
            </section>

            <section className={builder.card}>
              <div className={builder.sectionHeader}>
                <h2 className={builder.cardTitle}>
                  <Trans>Actions</Trans>
                </h2>
                <span className={classes.count}>
                  <Trans>
                    {actions.length} of {MAX_PROPOSAL_ACTIONS}
                  </Trans>
                </span>
              </div>
              <p className={builder.cardIntro}>
                <Trans>
                  What happens if the proposal passes. The treasury carries out the actions in
                  order, all in one go.
                </Trans>
              </p>

              <ActionList
                actions={actions}
                checks={checks}
                onEdit={index => setEditor({ kind: actions[index].kind, index })}
                onRemove={index => setActions(actions.filter((_, i) => i !== index))}
                onMove={moveAction}
              />

              {duplicateBlockers.map((b, i) => (
                <div key={i} className={builder.errorBox}>
                  <ExclamationCircleIcon />
                  <span>{b}</span>
                </div>
              ))}
              {warnings.map((w, i) => (
                <div key={i} className={builder.warning}>
                  <ExclamationCircleIcon />
                  <span>{w}</span>
                </div>
              ))}
              {total.gt(0) && !warnings.length && (
                <p className={classes.total}>
                  <Trans>
                    In total this proposal sends {formatEth(total)} ETH from the treasury.
                  </Trans>
                  {settings?.treasuryEth && (
                    <>
                      {' '}
                      <Trans>It holds {formatEth(settings.treasuryEth, 4)} ETH right now.</Trans>
                    </>
                  )}
                </p>
              )}

              {menuOpen ? (
                <div className={classes.menu}>
                  <div className={classes.menuHeader}>
                    <span className={builder.label}>
                      {actions.length ? (
                        <Trans>Add another action</Trans>
                      ) : (
                        <Trans>Add the first action</Trans>
                      )}
                    </span>
                    {actions.length > 0 && (
                      <button
                        type="button"
                        className={builder.linkButton}
                        onClick={() => setShowMenu(false)}
                      >
                        <Trans>Cancel</Trans>
                      </button>
                    )}
                  </div>
                  <AddActionMenu onPick={kind => setEditor({ kind })} />
                </div>
              ) : atLimit ? (
                <p className={builder.hint}>
                  <Trans>That's 10 actions, the most one proposal can have.</Trans>
                </p>
              ) : (
                <Button className={clsx(builder.darkButton, classes.addButton)} onClick={() => setShowMenu(true)}>
                  <PlusIcon className={classes.buttonIcon} aria-hidden />
                  <Trans>Add another action</Trans>
                </Button>
              )}
            </section>

            <div className={classes.footer}>
              {blockers.length > 0 && hasContent && (
                <ul className={classes.missing}>
                  {blockers.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
              <Button
                className={builder.primaryButton}
                disabled={blockers.length > 0}
                onClick={() => goTo('review')}
              >
                <Trans>Review proposal</Trans> →
              </Button>
            </div>
          </>
        )}
      </Col>

      {editor && (
        <ActionEditorModal
          kind={editor.kind}
          editing={editor.index !== undefined ? actions[editor.index] : undefined}
          onSave={saveAction}
          onClose={() => setEditor(undefined)}
        />
      )}
    </Section>
  );
};

export default CreateProposalPage;
