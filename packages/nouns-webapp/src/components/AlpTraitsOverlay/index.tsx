import classes from './AlpTraitsOverlay.module.css';
import React from 'react';
import ReactTooltip from 'react-tooltip';
import Image from 'react-bootstrap/Image';
import { useAppSelector } from '../../hooks';
import HeadIcon from '../../assets/icons/head.svg';
import GlassesIcon from '../../assets/icons/glasses.svg';
import AccessoryIcon from '../../assets/icons/accessory.svg';
import BodyIcon from '../../assets/icons/body.svg';
import BackgroundIcon from '../../assets/icons/background.svg';

const AlpTraitsOverlay: React.FC<{
  parts: { filename: string }[];
}> = props => {
  const { parts } = props;
  const getAlpTrait = (part: { filename: string }) => {
    const splitData: string[] = part.filename.split('-');
    return { trait: splitData[0], value: splitData.slice(1).join(' ') };
  };

  let stateBgColor = useAppSelector(state => state.application.stateBackgroundColor);

  const backgroundColors = {
    '#63a0f9': 'Bluebird Sky',
    '#018146': 'Evergreen',
    '#000000': 'Night',
    '#76858b': 'Slate',
    '#f8d689': 'Yellow Snow',
    '#d5d7e1': 'Cool',
    '#e1d7d5': 'Warm',
  };

  return (
    <ReactTooltip
      id="alp-traits"
      place="top"
      effect="float"
      backgroundColor="white"
      textColor="black"
    >
      <ul className={classes.traitList}>
        {/* {parts.map(part => {
          const { trait, value } = getAlpTrait(part);
          return (
            <li key={trait} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Image
                className={classes.image}
                src={traits[trait as keyof typeof traits]}
                style={{ marginRight: 10 }}
              />{' '}
              {value}{' '}
            </li>
          );
        })} */}
        <li key={'head'} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Image className={classes.image} src={HeadIcon} style={{ marginRight: 10 }} />{' '}
          {getAlpTrait(parts[2]).value}
        </li>
        <li key={'glasses'} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Image className={classes.image} src={GlassesIcon} style={{ marginRight: 10 }} />{' '}
          {getAlpTrait(parts[3]).value}
        </li>
        <li key={'body'} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Image className={classes.image} src={BodyIcon} style={{ marginRight: 10 }} />{' '}
          {getAlpTrait(parts[0]).value}
        </li>
        <li key={'accessory'} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Image className={classes.image} src={AccessoryIcon} style={{ marginRight: 10 }} />{' '}
          {getAlpTrait(parts[1]).value}
        </li>
        <li key="background" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Image className={classes.image} src={BackgroundIcon} style={{ marginRight: 10 }} />{' '}
          {backgroundColors[stateBgColor as keyof typeof backgroundColors]}
        </li>
      </ul>
    </ReactTooltip>
  );
};

export default AlpTraitsOverlay;
