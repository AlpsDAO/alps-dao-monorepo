import { ArtData } from '@nouns/assets';
import { BigNumber as EthersBN } from 'ethers';
import { IAlpSeed, useAlpSeed } from '../../wrappers/alpToken';
import Alp from '../Alp';
import { Link } from 'react-router-dom';
import classes from './StandaloneAlp.module.css';
import { useDispatch } from 'react-redux';
import { setOnDisplayAuctionAlpId } from '../../state/slices/onDisplayAuction';
import alpClasses from '../Alp/Alp.module.css';
import { AlpArt, alpArt, alpSvg, alpTraitNames, hasAllTraits, useAlpArt } from '../../utils/alpArt';

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
  /** moves the traits button and panel (see Alp) */
  menuClassName?: string;
}

// Building an Alp's SVG is costly and the same seed always gives the same image, so build each once
// (for the art it was built from)
const alpCache = new Map<string, ReturnType<typeof buildAlp>>();
let cachedArt: ArtData | undefined;

const buildAlp = (id: string, seed: IAlpSeed, art: ArtData, withImage = true) => {
  const name = `Alp ${id}`;
  const description = `Alp ${id}, a membership in Alps`;
  const image = withImage ? `data:image/svg+xml;base64,${btoa(alpSvg(seed, art))}` : '';

  return {
    name,
    description,
    image,
    traits: alpTraitNames(seed, art),
  };
};

/**
 * An Alp's image and trait names. An Alp wearing a trait the art doesn't have yet has no image while the
 * chain is being checked for it (so it shows as loading, not with the trait missing).
 */
export const getAlp = (
  alpId: string | EthersBN,
  seed: IAlpSeed,
  { art, checking }: AlpArt = alpArt(),
) => {
  if (art !== cachedArt) {
    alpCache.clear();
    cachedArt = art;
  }
  const id = alpId.toString();
  if (checking && !hasAllTraits(seed, art)) return buildAlp(id, seed, art, false);
  const key = [id, seed.background, seed.body, seed.accessory, seed.head, seed.glasses].join('-');
  let alp = alpCache.get(key);
  if (!alp) {
    alp = buildAlp(id, seed, art);
    alpCache.set(key, alp);
  }
  return alp;
};

/** `getAlp`, updating when traits new to the art arrive */
export const useAlp = (alpId: string | EthersBN | undefined, seed: IAlpSeed | undefined) => {
  const art = useAlpArt();
  return seed && alpId !== undefined ? getAlp(alpId, seed, art) : undefined;
};

const StandaloneAlp: React.FC<StandaloneAlpProps> = (props: StandaloneAlpProps) => {
  const { alpId } = props;
  const seed = useAlpSeed(alpId);
  const alp = useAlp(alpId, seed);

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
  const alp = useAlp(alpId, seed);

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
  const alp = useAlp(alpId, seed);

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
  const { alpId, onLoadSeed, shouldLinkToProfile, menuClassName } = props;

  const dispatch = useDispatch();
  const seed = useAlpSeed(alpId);
  const art = useAlpArt();
  const seedIsInvalid = Object.values(seed || {}).every(v => v === 0);

  if (!seed || seedIsInvalid || !alpId || !onLoadSeed) return <Alp imgPath="" alt="Alp" />;

  onLoadSeed(seed);

  const onClickHandler = () => {
    dispatch(setOnDisplayAuctionAlpId(alpId.toNumber()));
  };

  const { image, description, traits } = getAlp(alpId, seed, art);

  const alp = (
    <Alp
      imgPath={image}
      alt={description}
      traits={traits}
      menuClassName={menuClassName}
      download={
        image ? { name: `alp-${alpId.toString()}`, svg: () => alpSvg(seed, art.art) } : undefined
      }
    />
  );
  const alpWithLink = (
    <Link to={'/alp/' + alpId.toString()} className={classes.clickableAlp} onClick={onClickHandler}>
      {alp}
    </Link>
  );
  return shouldLinkToProfile ? alpWithLink : alp;
};

export default StandaloneAlp;
