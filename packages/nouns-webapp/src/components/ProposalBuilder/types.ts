import { ReactNode } from 'react';
import { ProposalActionTx } from '../../utils/proposalActions/encoding';

export type ActionKind =
  | 'send-eth'
  | 'send-token'
  | 'send-alp'
  | 'auction'
  | 'governor'
  | 'treasury-delay'
  | 'contract-call'
  | 'raw';

/** An action in the draft: the form it was made with (so it can be edited again) and its encoding. */
export interface BuilderAction {
  id: string;
  kind: ActionKind;
  form: unknown;
  tx: ProposalActionTx;
  /** ENS names typed for addresses in this action, lowercase address → name, for display */
  names?: Record<string, string>;
}

/** A template form's verdict on its current state. */
export interface ActionValidation {
  /** Present once the form describes a complete, valid action */
  tx?: ProposalActionTx;
  /** Problems with values already entered, by field */
  errors: Record<string, ReactNode>;
  /** Worth knowing, but not blocking */
  warnings?: ReactNode[];
  names?: Record<string, string>;
}

export const newActionId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
