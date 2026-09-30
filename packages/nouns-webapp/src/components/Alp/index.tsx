import classes from './Alp.module.css';
import React, { useState } from 'react';
import loadingAlp from '../../assets/loading-skull-alp.gif';
import Image from 'react-bootstrap/Image';
import AlpTraitsOverlay from '../AlpTraitsOverlay';
import AlpTraitList from '../AlpTraitList';
import { AlpTraits } from '../../utils/alpArt';
import { downloadAlpPng, downloadAlpSvg } from '../../utils/downloadAlp';
import TraitsIcon from '../../assets/icons/body.svg';
import DownloadIcon from '../../assets/icons/Download.svg';

export const LoadingAlp = () => {
  return (
    <div className={classes.imgWrapper}>
      <Image className={classes.img} src={loadingAlp} alt={'loading alp'} fluid />
    </div>
  );
};

type Format = 'png' | 'svg';

const Alp: React.FC<{
  imgPath: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  /** show these traits, on hover (desktop) or behind a button in the corner (phones) */
  traits?: AlpTraits;
  /** offer the art as PNG and SVG files, on hover (desktop) or behind a button in the corner (phones) */
  download?: { name: string; svg: () => string };
}> = props => {
  const { imgPath, alt, className, wrapperClassName, traits, download } = props;
  // the panel open above the corner buttons on phones, if any
  const [panel, setPanel] = useState<'traits' | 'download'>();

  // the art sits inside a link on some pages: these clicks mustn't follow it
  const handle = (action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };
  const toggle = (which: 'traits' | 'download') =>
    handle(() => setPanel(open => (open === which ? undefined : which)));
  const saveAs = (format: Format) =>
    handle(() => {
      if (!download) return;
      if (format === 'png') downloadAlpPng(download.svg(), download.name);
      else downloadAlpSvg(download.svg(), download.name);
      setPanel(undefined);
    });
  const formatButtons = (className: string) =>
    (['png', 'svg'] as Format[]).map(format => (
      <button key={format} type="button" className={className} onClick={saveAs(format)}>
        <img src={DownloadIcon} alt="" />
        {format.toUpperCase()}
      </button>
    ));

  return (
    <div className={`${classes.imgWrapper} ${wrapperClassName}`}>
      <Image
        className={`${classes.img} ${className}`}
        src={imgPath ? imgPath : loadingAlp}
        alt={alt}
        fluid
        // the hover tooltip, on the art only, so it stays out of the way of the download buttons
        {...(traits ? { 'data-tip': true, 'data-for': 'alp-traits' } : {})}
      />
      {traits && <AlpTraitsOverlay traits={traits} />}
      {download && <div className={classes.hoverDownloads}>{formatButtons(classes.hoverButton)}</div>}
      {(traits || download) && (
        <div className={classes.cornerButtons}>
          {download && (
            <button
              type="button"
              className={classes.cornerButton}
              aria-label="Download"
              aria-expanded={panel === 'download'}
              onClick={toggle('download')}
            >
              <img src={DownloadIcon} alt="" />
            </button>
          )}
          {traits && (
            <button
              type="button"
              className={classes.cornerButton}
              aria-label="Traits"
              aria-expanded={panel === 'traits'}
              onClick={toggle('traits')}
            >
              <img src={TraitsIcon} alt="" />
            </button>
          )}
        </div>
      )}
      {panel === 'traits' && traits && (
        <div className={classes.panel} onClick={handle(() => setPanel(undefined))}>
          <AlpTraitList traits={traits} variant="panel" />
        </div>
      )}
      {panel === 'download' && download && (
        <div className={`${classes.panel} ${classes.downloadPanel}`}>
          {formatButtons(classes.panelButton)}
        </div>
      )}
    </div>
  );
};

export default Alp;
