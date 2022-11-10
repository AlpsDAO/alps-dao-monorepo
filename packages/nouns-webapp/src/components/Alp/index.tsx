import classes from './Alp.module.css';
import React from 'react';
import loadingAlp from '../../assets/loading-skull-alp.gif';
import Image from 'react-bootstrap/Image';
import AlpTraitsOverlay from '../AlpTraitsOverlay';

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
  parts?: { filename: string }[];
}> = props => {
  const { imgPath, alt, className, wrapperClassName, parts } = props;
  return (
    <div className={`${classes.imgWrapper} ${wrapperClassName}`} data-tip data-for="alp-traits">
      <Image
        className={`${classes.img} ${className}`}
        src={imgPath ? imgPath : loadingAlp}
        alt={alt}
        fluid
      />
      {Boolean(parts?.length) && <AlpTraitsOverlay parts={parts!} />}
    </div>
  );
};

export default Alp;
