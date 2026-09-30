import React from 'react';
import Image from 'react-bootstrap/Image';
import HeadIcon from '../../assets/icons/head.svg';
import GlassesIcon from '../../assets/icons/glasses.svg';
import AccessoryIcon from '../../assets/icons/accessory.svg';
import BodyIcon from '../../assets/icons/body.svg';
import BackgroundIcon from '../../assets/icons/background.svg';
import classes from './AlpTraitList.module.css';
import { AlpTraits } from '../../utils/alpArt';

/**
 * An Alp's traits, by the names its on-chain metadata gives them, with their icons: head, glasses, body,
 * accessory and background.
 */
const AlpTraitList: React.FC<{
  traits: AlpTraits;
  variant: 'panel' | 'compact';
}> = ({ traits, variant }) => {
  const rows = [
    { key: 'head', icon: HeadIcon, name: traits.head },
    { key: 'glasses', icon: GlassesIcon, name: traits.glasses },
    { key: 'body', icon: BodyIcon, name: traits.body },
    { key: 'accessory', icon: AccessoryIcon, name: traits.accessory },
    { key: 'background', icon: BackgroundIcon, name: traits.background },
  ];
  return (
    <ul className={`${classes.list} ${classes[variant]}`}>
      {rows.map(t => (
        <li key={t.key} title={`${t.key}: ${t.name}`}>
          <Image className={classes.icon} src={t.icon} alt={t.key} />
          <span className={classes.name}>{t.name}</span>
        </li>
      ))}
    </ul>
  );
};

export default AlpTraitList;
