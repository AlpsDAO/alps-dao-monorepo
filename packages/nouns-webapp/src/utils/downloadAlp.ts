import { svg2png } from './svg2png';

const save = (href: string, filename: string) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
};

/** Save an Alp's art as an SVG file */
export const downloadAlpSvg = (svg: string, name: string) => {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  save(url, `${name}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Save an Alp's art as a large PNG (1600×1600, every pixel a crisp 50×50 square) */
export const downloadAlpPng = async (svg: string, name: string) => {
  const png = await svg2png(svg, 1600, 1600);
  if (png) save(png, `${name}.png`);
};
