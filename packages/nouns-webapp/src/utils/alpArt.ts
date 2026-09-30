import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { buildSVG } from '@nouns/sdk';
import {
  AlpSeed,
  ArtCounts,
  ArtData,
  EncodedImage,
  ImageData,
  PART_TYPES,
  PartType,
  getAlpData,
  getArtCounts,
  readArtSummary,
  readArtUpdates,
} from '@nouns/assets';
import config, { cacheKey, CHAIN_ID } from '../config';

/**
 * The art Alps are drawn from. It starts as the art bundled at build time; on first use the chain's trait
 * counts are checked (one eth_call) and anything added on chain since the build is read and merged in, so
 * new traits show without a redeploy.
 */
export interface AlpArt {
  art: ArtData;
  /** The trait counts the seeder picks from: the chain's once read, the art's until then */
  counts: ArtCounts;
  /** Still checking the chain for traits the art lacks */
  checking: boolean;
}

export interface AlpTraits {
  head: string;
  glasses: string;
  body: string;
  accessory: string;
  background: string;
}

const bundled = ImageData;
const sameCounts = (a: ArtCounts, b: ArtCounts) =>
  (Object.keys(a) as (keyof ArtCounts)[]).every(key => a[key] === b[key]);

let state: AlpArt = { art: bundled, counts: getArtCounts(bundled), checking: true };
const listeners = new Set<(state: AlpArt) => void>();

const update = (next: Partial<AlpArt>) => {
  const merged = { ...state, ...next };
  if (sameCounts(merged.counts, state.counts)) merged.counts = state.counts;
  if (
    merged.art === state.art &&
    merged.counts === state.counts &&
    merged.checking === state.checking
  ) {
    return;
  }
  state = merged;
  listeners.forEach(listener => listener(state));
};

const mapParts = <T>(fn: (type: PartType) => T) =>
  Object.fromEntries(PART_TYPES.map(type => [type, fn(type)])) as Record<PartType, T>;

// Traits added on chain since the build are kept for the next visit: only what the bundle lacks, under
// the bundle's counts so the next build starts afresh
interface CachedArt {
  bundle: string;
  counts: ArtCounts;
  palette: string[];
  bgcolors: string[];
  bgnames: string[];
  images: Record<PartType, EncodedImage[]>;
}
const CACHE_KEY = cacheKey(
  { name: 'art', version: 'v1' },
  CHAIN_ID,
  config.addresses.alpsDescriptor,
);
const bundleKey = [...Object.values(getArtCounts(bundled)), bundled.palette.length].join('-');

const readCache = (): CachedArt | undefined => {
  try {
    const cached: CachedArt | null = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return cached?.bundle === bundleKey ? cached : undefined;
  } catch {
    return undefined;
  }
};

const writeCache = (art: ArtData, counts: ArtCounts) => {
  const cached: CachedArt = {
    bundle: bundleKey,
    counts,
    palette: art.palette,
    bgcolors: art.bgcolors.slice(bundled.bgcolors.length),
    bgnames: art.bgnames.slice(bundled.bgcolors.length),
    images: mapParts(type => art.images[type].slice(bundled.images[type].length)),
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {}
};

const fromCache = (cached: CachedArt): ArtData => ({
  bgcolors: [...bundled.bgcolors, ...cached.bgcolors],
  bgnames: [...bundled.bgnames, ...cached.bgnames],
  palette: cached.palette,
  images: mapParts(type => [...bundled.images[type], ...cached.images[type]]),
});

let started = false;
const checkChain = async () => {
  if (started) return;
  started = true;
  const cached = readCache();
  if (cached) update({ art: fromCache(cached), counts: cached.counts });
  try {
    const provider = new ethers.providers.StaticJsonRpcProvider(config.app.jsonRpcUri, CHAIN_ID);
    const descriptor = config.addresses.alpsDescriptor;
    const summary = await readArtSummary(provider, descriptor);
    // Known before the new traits are read, so seeds come out right even if reading them fails
    update({ counts: summary.counts });
    const art = await readArtUpdates(provider, descriptor, summary, state.art);
    if (art !== state.art) writeCache(art, summary.counts);
    update({ art, checking: false });
  } catch {
    update({ checking: false });
  }
};

/** The art as it stands now; components use `useAlpArt` to re-render when it changes */
export const alpArt = () => state;

/** The art Alps are drawn from, starting the chain check on first use */
export const useAlpArt = (): AlpArt => {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(state);
    checkChain();
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return current;
};

/** Whether the art has every trait in the seed */
export const hasAllTraits = (seed: AlpSeed, art: ArtData) => {
  const { parts, background } = getAlpData(seed, art);
  return parts.every(Boolean) && background !== undefined;
};

/** The Alp's SVG, leaving out any trait the art doesn't have yet */
export const alpSvg = (seed: AlpSeed, art: ArtData) => {
  const { parts, background } = getAlpData(seed, art);
  // with warm, alpBackgroundColor's fallback, for a background the art doesn't have yet
  return buildSVG(parts.filter(Boolean), art.palette, background ?? 'e1d7d5');
};

/** "head-console-handheld" → "Console Handheld", for a trait the chain hasn't named yet */
const nameFromFilename = (filename: string) =>
  filename
    .split('-')
    .slice(1)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** A part's on-chain name, e.g. "Console Handheld" */
export const partName = (part?: EncodedImage) =>
  part ? part.name || nameFromFilename(part.filename) : '';

/** The Alp's trait names, as its on-chain metadata has them */
export const alpTraitNames = (seed: AlpSeed, art: ArtData): AlpTraits => {
  const [body, accessory, head, glasses] = getAlpData(seed, art).parts;
  return {
    head: partName(head),
    glasses: partName(glasses),
    body: partName(body),
    accessory: partName(accessory),
    background: art.bgnames[seed.background] ?? '',
  };
};
