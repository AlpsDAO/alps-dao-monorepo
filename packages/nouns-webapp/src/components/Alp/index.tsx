import classes from './Alp.module.css';
import React, { useState } from 'react';
import loadingAlp from '../../assets/loading-skull-alp.gif';
import Image from 'react-bootstrap/Image';
import AlpTraitsOverlay from '../AlpTraitsOverlay';
import AlpTraitList from '../AlpTraitList';
import { AlpTraits } from '../../utils/alpArt';

export const LoadingAlp = () => {
  return (
    <div className={classes.imgWrapper}>
      <Image className={classes.img} src={loadingAlp} alt={'loading alp'} fluid />
    </div>
  );
};

const Alp: React.FC<{
  imgPath: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  /** show these traits, on hover (desktop) or behind a button in the corner (phones) */
  traits?: AlpTraits;
}> = props => {
  const { imgPath, alt, className, wrapperClassName, traits } = props;
  const [showTraits, setShowTraits] = useState(false);

  return (
    <div className={`${classes.imgWrapper} ${wrapperClassName}`} data-tip data-for="alp-traits">
      <Image
        className={`${classes.img} ${className}`}
        src={imgPath ? imgPath : loadingAlp}
        alt={alt}
        fluid
      />
      {traits && (
        <>
          <AlpTraitsOverlay traits={traits} />
          <button
            type="button"
            className={classes.traitsButton}
            aria-label="Traits"
            aria-expanded={showTraits}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setShowTraits(shown => !shown);
            }}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                fill="currentColor"
              />
            </svg>
          </button>
          {showTraits && (
            <div
              className={classes.traitsPanel}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                setShowTraits(false);
              }}
            >
              <AlpTraitList traits={traits} variant="panel" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Alp;
