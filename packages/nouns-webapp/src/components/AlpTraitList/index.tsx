import React from 'react';
import Image from 'react-bootstrap/Image';
import HeadIcon from '../../assets/icons/head.svg';
import GlassesIcon from '../../assets/icons/glasses.svg';
import AccessoryIcon from '../../assets/icons/accessory.svg';
import BodyIcon from '../../assets/icons/body.svg';
import BackgroundIcon from '../../assets/icons/background.svg';
import classes from './AlpTraitList.module.css';

const BACKGROUND_NAMES: Record<string, string> = {
  '#63a0f9': 'Bluebird Sky',
  '#018146': 'Evergreen',
  '#000000': 'Night',
  '#76858b': 'Slate',
  '#f8d689': 'Yellow Snow',
  '#d5d7e1': 'Cool',
  '#e1d7d5': 'Warm',
};

/** "head-console-handheld" → "console handheld" (shown capitalised) */
const traitName = (part?: { filename: string }) => part?.filename.split('-').slice(1).join(' ') ?? '';

/**
 * An Alp's traits with their icons: head, glasses, body, accessory and background. `parts` is in the
 * order getAlpData gives them: body, accessory, head, glasses.
 */
const AlpTraitList: React.FC<{
  parts: { filename: string }[];
  /** the Alp's background colour, e.g. "#018146" */
  background: string;
  variant: 'tooltip' | 'panel' | 'compact';
}> = ({ parts, background, variant }) => {
  const traits = [
    { key: 'head', icon: HeadIcon, name: traitName(parts[2]) },
    { key: 'glasses', icon: GlassesIcon, name: traitName(parts[3]) },
    { key: 'body', icon: BodyIcon, name: traitName(parts[0]) },
    { key: 'accessory', icon: AccessoryIcon, name: traitName(parts[1]) },
    { key: 'background', icon: BackgroundIcon, name: BACKGROUND_NAMES[background.toLowerCase()] ?? '' },
  ];
  return (
    <ul className={`${classes.list} ${classes[variant]}`}>
      {traits.map(t => (
        <li key={t.key} title={`${t.key}: ${t.name}`}>
          <Image className={classes.icon} src={t.icon} alt={t.key} />
          <span className={classes.name}>{t.name}</span>
        </li>
      ))}
    </ul>
  );
};

export default AlpTraitList;
