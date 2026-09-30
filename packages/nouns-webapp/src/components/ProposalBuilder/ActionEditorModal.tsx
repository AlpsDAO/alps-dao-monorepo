import React, { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { Trans } from '@lingui/macro';
import { useDaoSettings } from '../../hooks/useDaoSettings';
import { ActionSummary } from '../ProposalActionSummary';
import { Warnings } from './inputs/Field';
import { templateFor } from './templates';
import { ActionKind, BuilderAction, newActionId } from './types';
import classes from './ProposalBuilder.module.css';

/** Fills in fields a form saved by an older version of the builder might lack. */
const restoreForm = (kind: ActionKind, form: unknown) => {
  const initial = templateFor(kind).initialForm();
  return form && typeof form === 'object' ? { ...initial, ...form } : initial;
};

/** The form for one action, in a dialog, with a live summary of what it will do. */
const ActionEditorModal: React.FC<{
  kind: ActionKind;
  /** The action being edited; a new one is added otherwise */
  editing?: BuilderAction;
  onSave: (action: BuilderAction) => void;
  onClose: () => void;
}> = ({ kind, editing, onSave, onClose }) => {
  const template = templateFor(kind);
  const [form, setForm] = useState(() => restoreForm(kind, editing?.form));
  const settings = useDaoSettings();
  const validation = template.validate(form, settings);
  const { Form, icon: Icon } = template;

  const save = () => {
    if (!validation.tx) return;
    onSave({
      id: editing?.id ?? newActionId(),
      kind,
      form,
      tx: validation.tx,
      names: validation.names,
    });
  };

  return (
    <Modal
      show
      onHide={onClose}
      centered
      size="lg"
      fullscreen="sm-down"
      scrollable
      contentClassName={classes.modalContent}
      aria-labelledby="action-editor-title"
    >
      <Modal.Header closeButton className={classes.modalHeader}>
        <Modal.Title id="action-editor-title" className={classes.modalTitle}>
          <Icon className={classes.modalIcon} aria-hidden />
          {template.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className={classes.modalBody}>
        <form
          onSubmit={e => {
            e.preventDefault();
            save();
          }}
        >
          <Form form={form} onChange={setForm} validation={validation} settings={settings} />
          <Warnings warnings={validation.warnings} />
          {/* Enter in a field submits once the action is complete */}
          <button type="submit" hidden aria-hidden tabIndex={-1} />
        </form>
      </Modal.Body>
      <Modal.Footer className={classes.modalFooter}>
        <div className={classes.modalPreview} aria-live="polite">
          {validation.tx ? (
            <>
              <span className={classes.previewLabel}>
                <Trans>Preview</Trans>
              </span>
              <ActionSummary tx={validation.tx} names={validation.names} />
            </>
          ) : (
            <span className={classes.previewEmpty}>
              <Trans>Fill in the details and you'll see here what this action will do.</Trans>
            </span>
          )}
        </div>
        <div className={classes.modalButtons}>
          <Button className={classes.secondaryButton} onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button className={classes.darkButton} disabled={!validation.tx} onClick={save}>
            {editing ? <Trans>Save changes</Trans> : <Trans>Add action</Trans>}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ActionEditorModal;
