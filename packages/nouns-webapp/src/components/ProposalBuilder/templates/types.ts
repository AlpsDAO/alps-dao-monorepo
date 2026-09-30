import React, { ReactNode } from 'react';
import { DaoSettings } from '../../../hooks/useDaoSettings';
import { ActionKind, ActionValidation } from '../types';

export interface TemplateFormProps<F> {
  form: F;
  onChange: (form: F) => void;
  validation: ActionValidation;
  settings?: DaoSettings;
}

export interface ActionTemplate<F = any> {
  kind: ActionKind;
  title: ReactNode;
  description: ReactNode;
  icon: React.ComponentType<React.ComponentProps<'svg'>>;
  initialForm: () => F;
  validate: (form: F, settings?: DaoSettings) => ActionValidation;
  Form: React.FC<TemplateFormProps<F>>;
}

/** lowercase address → ENS name, for summaries */
export const namesFor = (...values: Array<{ address?: string; ensName?: string } | undefined>) => {
  const names: Record<string, string> = {};
  values.forEach(v => {
    if (v?.address && v.ensName) names[v.address.toLowerCase()] = v.ensName;
  });
  return names;
};
