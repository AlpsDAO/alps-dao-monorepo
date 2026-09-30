import { BuilderAction } from './types';

const DRAFT_KEY = 'alps-proposal-draft';

export interface ProposalDraft {
  title: string;
  body: string;
  actions: BuilderAction[];
}

export const emptyDraft = (): ProposalDraft => ({ title: '', body: '', actions: [] });

const isAction = (a: any): a is BuilderAction =>
  typeof a?.id === 'string' &&
  typeof a?.kind === 'string' &&
  typeof a?.tx?.target === 'string' &&
  typeof a?.tx?.value === 'string' &&
  typeof a?.tx?.signature === 'string' &&
  typeof a?.tx?.calldata === 'string';

export const loadDraft = (): ProposalDraft => {
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
    if (!stored || typeof stored !== 'object') return emptyDraft();
    return {
      title: typeof stored.title === 'string' ? stored.title : '',
      body: typeof stored.body === 'string' ? stored.body : '',
      actions: Array.isArray(stored.actions) ? stored.actions.filter(isAction) : [],
    };
  } catch {
    return emptyDraft();
  }
};

export const saveDraft = (draft: ProposalDraft) => {
  try {
    if (!draft.title && !draft.body && !draft.actions.length) {
      localStorage.removeItem(DRAFT_KEY);
    } else {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  } catch {}
};

export const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
};
