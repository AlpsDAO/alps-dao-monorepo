import { ImageData as data, getAlpData } from '@nouns/assets';
import { buildSVG } from '@nouns/sdk';
import { BigNumber as EthersBN } from 'ethers';
import { IAlpSeed, useAlpSeed } from '../../wrappers/alpToken';
import Alp from '../Alp';
import { Link } from 'react-router-dom';
import classes from './StandaloneAlp.module.css';
import { useDispatch } from 'react-redux';
import { setOnDisplayAuctionAlpId } from '../../state/slices/onDisplayAuction';
import alpClasses from '../Alp/Alp.module.css';

interface StandaloneAlpProps {
  alpId: EthersBN;
}
interface StandaloneCircularAlpProps {
  alpId: EthersBN;
  border?: boolean;
}

interface StandaloneAlpWithSeedProps {
  alpId: EthersBN;
  onLoadSeed?: (seed: IAlpSeed) => void;
  shouldLinkToProfile: boolean;
}

export const getAlp = (alpId: string | EthersBN, seed: IAlpSeed) => {
  const id = alpId.toString();
  const name = `Alp ${id}`;
  const description = `Alp ${id} is a member of the Alps DAO`;
  const { parts, background } = getAlpData(seed);
  const image = `data:image/svg+xml;base64,${btoa(buildSVG(parts, data.palette, background))}`;

  return {
    name,
    description,
    image,
    parts,
  };
};

const StandaloneAlp: React.FC<StandaloneAlpProps> = (props: StandaloneAlpProps) => {
  const { alpId } = props;
  const seed = useAlpSeed(alpId);
  const alp = seed && getAlp(alpId, seed);

  const dispatch = useDispatch();

  const onClickHandler = () => {
    dispatch(setOnDisplayAuctionAlpId(alpId.toNumber()));
  };

  return (
    <Link to={'/alp/' + alpId.toString()} className={classes.clickableAlp} onClick={onClickHandler}>
      <Alp imgPath={alp ? alp.image : ''} alt={alp ? alp.description : 'Alp'} />
    </Link>
  );
};

export const StandaloneAlpCircular: React.FC<StandaloneCircularAlpProps> = (
  props: StandaloneCircularAlpProps,
) => {
  const { alpId, border } = props;
  const seed = useAlpSeed(alpId);
  const alp = seed && getAlp(alpId, seed);

  const dispatch = useDispatch();
  const onClickHandler = () => {
    dispatch(setOnDisplayAuctionAlpId(alpId.toNumber()));
  };

  if (!seed || !alpId) return <Alp imgPath="" alt="Alp" />;

  return (
    <Link to={'/alp/' + alpId.toString()} className={classes.clickableAlp} onClick={onClickHandler}>
      <Alp
        imgPath={alp ? alp.image : ''}
        alt={alp ? alp.description : 'Alp'}
        wrapperClassName={alpClasses.circularAlpWrapper}
        className={border ? alpClasses.circleWithBorder : alpClasses.circular}
      />
    </Link>
  );
};

export const StandaloneAlpRoundedCorners: React.FC<StandaloneAlpProps> = (
  props: StandaloneAlpProps,
) => {
  const { alpId } = props;
  const seed = useAlpSeed(alpId);
  const alp = seed && getAlp(alpId, seed);

  const dispatch = useDispatch();
  const onClickHandler = () => {
    dispatch(setOnDisplayAuctionAlpId(alpId.toNumber()));
  };

  return (
    <Link to={'/alp/' + alpId.toString()} className={classes.clickableAlp} onClick={onClickHandler}>
      <Alp
        imgPath={alp ? alp.image : ''}
        alt={alp ? alp.description : 'Alp'}
        className={alpClasses.rounded}
      />
    </Link>
  );
};

export const StandaloneAlpWithSeed: React.FC<StandaloneAlpWithSeedProps> = (
  props: StandaloneAlpWithSeedProps,
) => {
  const { alpId, onLoadSeed, shouldLinkToProfile } = props;

  const dispatch = useDispatch();
  const seed = useAlpSeed(alpId);
  const seedIsInvalid = Object.values(seed || {}).every(v => v === 0);

  if (!seed || seedIsInvalid || !alpId || !onLoadSeed) return <Alp imgPath="" alt="Alp" />;

  onLoadSeed(seed);

  const onClickHandler = () => {
    dispatch(setOnDisplayAuctionAlpId(alpId.toNumber()));
  };

  const { image, description, parts } = getAlp(alpId, seed);

  const alp = <Alp imgPath={image} alt={description} parts={parts} />;
  const alpWithLink = (
    <Link to={'/alp/' + alpId.toString()} className={classes.clickableAlp} onClick={onClickHandler}>
      {alp}
    </Link>
  );
  return shouldLinkToProfile ? alpWithLink : alp;
};

export default StandaloneAlp;
