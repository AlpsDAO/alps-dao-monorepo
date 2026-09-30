export interface AlpSeed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

export interface EncodedImage {
  filename: string;
  /** The trait's name on chain (what the token's metadata shows), e.g. "Console Handheld" */
  name?: string;
  data: string;
}

export interface AlpData {
  parts: EncodedImage[];
  background: string;
}

export type PartType = 'bodies' | 'accessories' | 'heads' | 'glasses';

/** The art every Alp is drawn from: the bundled `ImageData`, or the same read from the chain */
export interface ArtData {
  bgcolors: string[];
  /** The backgrounds' names on chain, by index ('' where the chain has none yet) */
  bgnames: string[];
  palette: string[];
  images: Record<PartType, EncodedImage[]>;
}

/** How many of each trait there are, which is what the seeder picks an Alp's traits from */
export interface ArtCounts {
  backgrounds: number;
  bodies: number;
  accessories: number;
  heads: number;
  glasses: number;
}
