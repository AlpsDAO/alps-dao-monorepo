import { ReactNode } from 'react';
import classes from './MobileAlpActivityRow.module.css';

interface MobileAlpActivityRowProps {
  onClick: () => void;
  icon: ReactNode;
  primaryContent: ReactNode;
  secondaryContent?: ReactNode;
}

const MobileAlpActivityRow: React.FC<MobileAlpActivityRowProps> = props => {
  const { onClick, icon, primaryContent, secondaryContent } = props;

  return (
    <div className={classes.wrapper} onClick={onClick}>
      <div className={classes.icon}>{icon}</div>

      <div className={classes.content}>
        <div>{primaryContent}</div>
        <div>{secondaryContent}</div>
      </div>
    </div>
  );
};

export default MobileAlpActivityRow;
