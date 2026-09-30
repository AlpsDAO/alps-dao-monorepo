import React, { useState } from 'react';
import { FormControl } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Trans } from '@lingui/macro';
import clsx from 'clsx';
import classes from './ProposalBuilder.module.css';

const OUTLINE = `## Summary

What you're proposing, in a sentence or two.

## Why

The problem it solves, or the opportunity it takes.

## Details

What happens and when: who gets paid, what they deliver, how the club will know it's done.

## Budget

What the actions below send, and what it's for.
`;

export const MarkdownPreview: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className={classes.preview}>
    {title.trim() ? (
      <h1 className={classes.previewTitle}>{title.trim()}</h1>
    ) : (
      <h1 className={clsx(classes.previewTitle, classes.previewPlaceholder)}>
        <Trans>Untitled</Trans>
      </h1>
    )}
    {body.trim() ? (
      <ReactMarkdown className={classes.markdown} children={body} remarkPlugins={[remarkBreaks]} />
    ) : (
      <p className={classes.previewPlaceholder}>
        <Trans>Nothing written yet.</Trans>
      </p>
    )}
  </div>
);

/** The proposal's title and its markdown description, with a preview as voters will see it. */
const ProposalTextEditor: React.FC<{
  title: string;
  body: string;
  onTitleChange: (title: string) => void;
  onBodyChange: (body: string) => void;
}> = ({ title, body, onTitleChange, onBodyChange }) => {
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  return (
    <>
      <div className={classes.field}>
        <div className={classes.labelRow}>
          <label className={classes.label} htmlFor="proposal-title">
            <Trans>Title</Trans>
          </label>
        </div>
        <FormControl
          id="proposal-title"
          className={clsx(classes.input, classes.titleInput)}
          value={title}
          maxLength={200}
          placeholder="A short title that says what the proposal does"
          onChange={e => onTitleChange(e.target.value.replace(/[\r\n]+/g, ' '))}
        />
      </div>

      <div className={classes.field}>
        <div className={classes.labelRow}>
          <span className={classes.label}>
            <Trans>Description</Trans>
          </span>
          <div className={classes.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'write'}
              className={clsx(classes.tab, tab === 'write' && classes.activeTab)}
              onClick={() => setTab('write')}
            >
              <Trans>Write</Trans>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'preview'}
              className={clsx(classes.tab, tab === 'preview' && classes.activeTab)}
              onClick={() => setTab('preview')}
            >
              <Trans>Preview</Trans>
            </button>
          </div>
        </div>
        {tab === 'write' ? (
          <>
            <FormControl
              as="textarea"
              aria-label="Description"
              className={clsx(classes.input, classes.bodyInput)}
              value={body}
              placeholder={OUTLINE}
              onChange={e => onBodyChange(e.target.value)}
            />
            <div className={classes.hint}>
              <Trans>
                Markdown works: ## for headings, **bold**, - for lists, [text](https://link) for
                links, ![](https://image-url) for images.
              </Trans>{' '}
              {!body.trim() && (
                <button type="button" className={classes.linkButton} onClick={() => onBodyChange(OUTLINE)}>
                  <Trans>Start from an outline</Trans>
                </button>
              )}
            </div>
          </>
        ) : (
          <MarkdownPreview title={title} body={body} />
        )}
      </div>
    </>
  );
};

export default ProposalTextEditor;
