import React from 'react';
import { BigNumber as EthersBN } from 'ethers';
import { useAlpSeed } from '../../wrappers/alpToken';
import { svg2png } from '../../utils/svg2png';
import { alpSvg, useAlpArt } from '../../utils/alpArt';
import AlpInfoRowButton from '../AlpInfoRowButton';
import _DownloadIcon from '../../assets/icons/Download.svg';
import classes from './AlpDownloadButtons.module.css';

const save = (href: string, filename: string) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
};

/** Download an Alp's art: the SVG, or a large PNG (1600×1600, every pixel a crisp 50×50 square). */
const AlpDownloadButtons: React.FC<{ alpId: EthersBN }> = ({ alpId }) => {
  const seed = useAlpSeed(alpId);
  const { art } = useAlpArt();
  if (!seed) return null;

  const svg = () => alpSvg(seed, art);
  const filename = `alp-${alpId.toString()}`;

  const downloadSvg = () => {
    const url = URL.createObjectURL(new Blob([svg()], { type: 'image/svg+xml' }));
    save(url, `${filename}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const downloadPng = async () => {
    const png = await svg2png(svg(), 1600, 1600);
    if (png) save(png, `${filename}.png`);
  };

  return (
    <div className={classes.downloads}>
      <AlpInfoRowButton iconImgSource={_DownloadIcon} btnText="PNG" onClickHandler={downloadPng} />
      <AlpInfoRowButton iconImgSource={_DownloadIcon} btnText="SVG" onClickHandler={downloadSvg} />
    </div>
  );
};

export default AlpDownloadButtons;
