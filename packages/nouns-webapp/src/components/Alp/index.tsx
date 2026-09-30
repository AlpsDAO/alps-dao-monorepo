import classes from './Alp.module.css';
import React, { useEffect, useRef, useState } from 'react';
import loadingAlp from '../../assets/loading-skull-alp.gif';
import Image from 'react-bootstrap/Image';
import AlpTraitList from '../AlpTraitList';
import { AlpTraits } from '../../utils/alpArt';
import { downloadAlpPng, downloadAlpSvg } from '../../utils/downloadAlp';
import EyeIcon from '../../assets/icons/eye.svg';
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
  /**
   * show these traits in a panel in the art's bottom-right corner: on hover (desktop), or from an eye
   * button there (phones)
   */
  traits?: AlpTraits;
  /** offer the art as PNG and SVG files, in the traits panel */
  download?: { name: string; svg: () => string };
  /** moves the eye button and its panel from the art's bottom-right corner */
  menuClassName?: string;
}> = props => {
  const { imgPath, alt, className, wrapperClassName, traits, download, menuClassName } = props;
  // whether the eye button has opened the panel (phones)
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  // a tap anywhere else closes it
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  // the art sits inside a link on some pages: these clicks mustn't follow it
  const handle = (action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };
  const saveAs = (format: Format) =>
    handle(() => {
      if (!download) return;
      if (format === 'png') downloadAlpPng(download.svg(), download.name);
      else downloadAlpSvg(download.svg(), download.name);
      setOpen(false);
    });

  return (
    <div className={`${classes.imgWrapper} ${wrapperClassName}`}>
      <Image
        className={`${classes.img} ${className}`}
        src={imgPath ? imgPath : loadingAlp}
        alt={alt}
        fluid
      />
      {traits && (
        <div
          ref={menu}
          className={`${classes.menu} ${open ? classes.open : ''} ${menuClassName ?? ''}`}
        >
          <button
            type="button"
            className={classes.eyeButton}
            aria-label="Traits"
            aria-expanded={open}
            onClick={handle(() => setOpen(shown => !shown))}
          >
            <img src={EyeIcon} alt="" />
          </button>
          <div className={classes.panel}>
            <AlpTraitList traits={traits} variant="panel" />
            {download && (
              <div className={classes.downloads}>
                {(['png', 'svg'] as Format[]).map(format => (
                  <button
                    key={format}
                    type="button"
                    className={classes.downloadButton}
                    onClick={saveAs(format)}
                  >
                    <img src={DownloadIcon} alt="" />
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Alp;
