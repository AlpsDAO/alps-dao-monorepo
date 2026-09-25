import React, { ReactNode, useState } from 'react';
import clsx from 'clsx';
import classes from './ProposalTabs.module.css';

export interface ProposalTab {
  key: string;
  label: ReactNode;
  count?: number;
  content: ReactNode;
}

/**
 * Tab bar for a proposal's sections. Inactive panels stay mounted (just hidden) so switching back
 * doesn't reload them.
 */
const ProposalTabs: React.FC<{ tabs: ProposalTab[] }> = ({ tabs }) => {
  const [active, setActive] = useState(tabs[0]?.key);
  return (
    <div className={classes.tabs}>
      <div role="tablist" className={classes.tabList}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`proposal-tab-${tab.key}`}
            aria-selected={tab.key === active}
            aria-controls={`proposal-tabpanel-${tab.key}`}
            className={clsx(classes.tab, tab.key === active && classes.active)}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
            {tab.count !== undefined && <span className={classes.count}>{tab.count}</span>}
          </button>
        ))}
      </div>
      {tabs.map(tab => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`proposal-tabpanel-${tab.key}`}
          aria-labelledby={`proposal-tab-${tab.key}`}
          hidden={tab.key !== active}
          className={classes.panel}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
};

export default ProposalTabs;
