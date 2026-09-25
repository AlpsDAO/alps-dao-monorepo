import { ImageData } from '@nouns/assets';
export const grey = '#d5d7e1';
export const beige = '#e1d7d5';

/** An Alp's background colour, from its seed. */
export const alpBackgroundColor = (seed: { background: number }) =>
  `#${ImageData.bgcolors[seed.background] ?? beige.slice(1)}`;
