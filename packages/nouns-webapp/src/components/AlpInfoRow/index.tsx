import React from 'react';
import { Image } from 'react-bootstrap';
import { useAppSelector } from '../../hooks';
import classes from './AlpInfoRow.module.css';

/**
 * One line of a past Alp's details: an icon and label, then the value. On phones the label sits on the
 * left and the value on the right, like the winning bid and holder above.
 */
const AlpInfoRow: React.FC<{ icon: string; label: React.ReactNode }> = ({
  icon,
  label,
  children,
}) => {
  const isCool = useAppSelector(state => state.application.isCoolBackground);
  return (
    <div
      className={classes.row}
      style={{ color: isCool ? 'var(--brand-black)' : 'var(--brand-white)' }}
    >
      <span className={classes.label}>
        <Image
          src={icon}
          className={classes.icon}
          style={{ filter: isCool ? '' : 'brightness(0) invert(1)' }}
        />
        {label}
      </span>
      <span className={classes.value}>{children}</span>
    </div>
  );
};

export default AlpInfoRow;
