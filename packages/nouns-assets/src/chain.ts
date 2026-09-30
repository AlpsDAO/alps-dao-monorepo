import { defaultAbiCoder, Interface, Result } from '@ethersproject/abi';
import { inflateRawSync } from 'zlib';
import { ArtCounts, ArtData, EncodedImage, PartType } from './types';

/** The two JSON-RPC calls the reader makes; an ethers v5 provider has both */
export interface ArtProvider {
  call(transaction: { to: string; data: string }): Promise<string>;
  getCode(address: string): Promise<string>;
}

/** What the descriptor says about its art, read in a single call: enough to tell if some art is current */
export interface ArtSummary {
  art: string;
  attribute: string;
  counts: ArtCounts;
  palette: string[];
}

interface StoragePage {
  imageCount: number;
  decompressedLength: number;
  pointer: string;
}

// Multicall3 has the same address on mainnet and most other chains
export const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11';

const multicallAbi = new Interface([
  'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
]);

const descriptorAbi = new Interface([
  'function art() view returns (address)',
  'function attribute() view returns (address)',
  'function backgroundCount() view returns (uint256)',
  'function bodyCount() view returns (uint256)',
  'function accessoryCount() view returns (uint256)',
  'function headCount() view returns (uint256)',
  'function glassesCount() view returns (uint256)',
  'function backgrounds(uint256 index) view returns (string)',
  'function palettes(uint8 index) view returns (bytes)',
]);

const TRAIT =
  'tuple(tuple(uint16 imageCount, uint80 decompressedLength, address pointer)[] storagePages, uint256 storedImagesCount)';
const artAbi = new Interface([
  `function getBodiesTrait() view returns (${TRAIT})`,
  `function getAccessoriesTrait() view returns (${TRAIT})`,
  `function getHeadsTrait() view returns (${TRAIT})`,
  `function getGlassesTrait() view returns (${TRAIT})`,
]);

const attributeAbi = new Interface([
  'function backgrounds(uint256 index) view returns (string)',
  'function bodies(uint256 index) view returns (string)',
  'function accessories(uint256 index) view returns (string)',
  'function heads(uint256 index) view returns (string)',
  'function glasses(uint256 index) view returns (string)',
]);

const PARTS: Record<PartType, { count: string; trait: string; prefix: string }> = {
  bodies: { count: 'bodyCount', trait: 'getBodiesTrait', prefix: 'body' },
  accessories: { count: 'accessoryCount', trait: 'getAccessoriesTrait', prefix: 'accessory' },
  heads: { count: 'headCount', trait: 'getHeadsTrait', prefix: 'head' },
  glasses: { count: 'glassesCount', trait: 'getGlassesTrait', prefix: 'glasses' },
};

export const PART_TYPES = Object.keys(PARTS) as PartType[];

export const EMPTY_ART: ArtData = {
  bgcolors: [],
  bgnames: [],
  palette: [],
  images: { bodies: [], accessories: [], heads: [], glasses: [] },
};

interface Call {
  target: string;
  abi: Interface;
  fn: string;
  args?: unknown[];
}

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(to - from, 0) }, (_, i) => from + i);

/** Many view calls in one eth_call; a call that fails (e.g. a name not added yet) comes back undefined */
const aggregate = async (provider: ArtProvider, calls: Call[]): Promise<(Result | undefined)[]> => {
  if (!calls.length) return [];
  const data = multicallAbi.encodeFunctionData('aggregate3', [
    calls.map(({ target, abi, fn, args = [] }) => ({
      target,
      allowFailure: true,
      callData: abi.encodeFunctionData(fn, args),
    })),
  ]);
  const [results] = multicallAbi.decodeFunctionResult(
    'aggregate3',
    await provider.call({ to: MULTICALL3, data }),
  );
  return results.map(
    ({ success, returnData }: { success: boolean; returnData: string }, i: number) => {
      if (!success) return undefined;
      try {
        return calls[i].abi.decodeFunctionResult(calls[i].fn, returnData);
      } catch {
        return undefined;
      }
    },
  );
};

/** `aggregate` in chunks, so no one eth_call runs into an RPC's gas cap */
const aggregateInChunks = async (provider: ArtProvider, calls: Call[], size = 150) => {
  const chunks = range(0, Math.ceil(calls.length / size)).map(i =>
    calls.slice(i * size, (i + 1) * size),
  );
  return (await Promise.all(chunks.map(chunk => aggregate(provider, chunk)))).flat();
};

/** Results of calls that all had to succeed */
const allRead = (results: (Result | undefined)[], what: string): Result[] => {
  if (results.some(result => !result)) throw new Error(`Could not read ${what}`);
  return results as Result[];
};

/** Palette bytes, 3 per colour, as the hex colours the SVG builder takes; colour 0 is transparent */
const toPalette = (bytes: string) =>
  (bytes.replace(/^0x/, '').match(/.{6}/g) ?? []).map((colour, i) => (i === 0 ? '' : colour));

const samePalette = (a: string[], b: string[]) =>
  a.length === b.length && a.every((colour, i) => colour === b[i]);

/** An image's filename in the style of the bundled ones, e.g. "head-console-handheld" */
const toFilename = (type: PartType, index: number, name?: string) =>
  `${PARTS[type].prefix}-${name ? name.trim().toLowerCase().split(/\s+/).join('-') : index}`;

/**
 * The descriptor's art and attribute contracts, trait counts and palette, in one eth_call.
 * @param provider A JSON-RPC connection
 * @param descriptor The AlpsDescriptorV2 address
 */
export const readArtSummary = async (
  provider: ArtProvider,
  descriptor: string,
): Promise<ArtSummary> => {
  const fns = ['art', 'attribute', 'backgroundCount', ...Object.values(PARTS).map(p => p.count)];
  const results = await aggregate(provider, [
    ...fns.map(fn => ({ target: descriptor, abi: descriptorAbi, fn })),
    { target: descriptor, abi: descriptorAbi, fn: 'palettes', args: [0] },
  ]);
  const [art, attribute, backgrounds, bodies, accessories, heads, glasses, palette] = allRead(
    results,
    `the descriptor at ${descriptor}`,
  ).map(result => result[0]);
  return {
    art,
    attribute,
    counts: {
      backgrounds: backgrounds.toNumber(),
      bodies: bodies.toNumber(),
      accessories: accessories.toNumber(),
      heads: heads.toNumber(),
      glasses: glasses.toNumber(),
    },
    palette: toPalette(palette),
  };
};

const missingNames = (names: (string | undefined)[], count: number) =>
  range(0, count).filter(i => !names[i]);

/** Whether `art` has every trait, name and colour the chain has (it may have more, e.g. on a testnet) */
export const isArtCurrent = ({ counts, palette }: ArtSummary, art: ArtData) =>
  samePalette(palette, art.palette) &&
  art.bgcolors.length >= counts.backgrounds &&
  !missingNames(art.bgnames, counts.backgrounds).length &&
  PART_TYPES.every(
    type =>
      art.images[type].length >= counts[type] &&
      !missingNames(
        art.images[type].map(part => part.name),
        counts[type],
      ).length,
  );

/**
 * One page of a trait's images. AlpsArt stores each page with SSTORE2, as the code of a contract of its
 * own: a STOP byte, then the page's images abi-encoded as bytes[] and deflated. Reading that code and
 * inflating it here takes one cheap eth_getCode, where the contract's heads(i) inflates the whole page on
 * chain for every image.
 */
const readPage = async (provider: ArtProvider, page: StoragePage): Promise<string[]> => {
  const code = await provider.getCode(page.pointer);
  if (!code.startsWith('0x00')) throw new Error(`No art stored at ${page.pointer}`);
  const inflated = inflateRawSync(Buffer.from(code.slice(4), 'hex'));
  if (inflated.length !== page.decompressedLength) {
    throw new Error(`The page at ${page.pointer} inflated to the wrong length`);
  }
  const [images] = defaultAbiCoder.decode(['bytes[]'], inflated);
  if (images.length !== page.imageCount) {
    throw new Error(`The page at ${page.pointer} holds the wrong number of images`);
  }
  return images;
};

/** The images from index `from` up to `to`, reading only the pages they're on */
const readImages = async (
  provider: ArtProvider,
  pages: StoragePage[],
  from: number,
  to: number,
): Promise<string[]> => {
  let pageStart = 0;
  const reads = pages.map(page => {
    const start = pageStart;
    const end = (pageStart += page.imageCount);
    if (end <= from || start >= to) return Promise.resolve([]);
    return readPage(provider, page).then(images =>
      images.slice(Math.max(from - start, 0), Math.min(to, end) - start),
    );
  });
  const images = (await Promise.all(reads)).flat();
  if (images.length !== to - from) throw new Error('The art has fewer images than its count');
  return images;
};

/**
 * `art` brought up to date with the chain: the parts and backgrounds past its counts, names it lacks, and
 * the palette if it changed. Only what's missing is read, and `art` itself comes back if it was current.
 * @param provider A JSON-RPC connection
 * @param descriptor The AlpsDescriptorV2 address
 * @param summary The descriptor's summary, from `readArtSummary`
 * @param art The art to bring up to date; everything is read when it's left out
 */
export const readArtUpdates = async (
  provider: ArtProvider,
  descriptor: string,
  summary: ArtSummary,
  art: ArtData = EMPTY_ART,
): Promise<ArtData> => {
  if (isArtCurrent(summary, art)) return art;
  const { counts } = summary;
  const grown = PART_TYPES.filter(type => counts[type] > art.images[type].length);

  const bgNameIndexes = missingNames(art.bgnames, counts.backgrounds);
  const partNameIndexes = PART_TYPES.map(type =>
    missingNames(
      art.images[type].map(part => part.name),
      counts[type],
    ),
  );
  const [traitResults, bgcolorResults, names] = await Promise.all([
    aggregate(
      provider,
      grown.map(type => ({ target: summary.art, abi: artAbi, fn: PARTS[type].trait })),
    ),
    aggregateInChunks(
      provider,
      range(art.bgcolors.length, counts.backgrounds).map(i => ({
        target: descriptor,
        abi: descriptorAbi,
        fn: 'backgrounds',
        args: [i],
      })),
    ),
    aggregateInChunks(provider, [
      ...bgNameIndexes.map(i => ({
        target: summary.attribute,
        abi: attributeAbi,
        fn: 'backgrounds',
        args: [i],
      })),
      ...PART_TYPES.flatMap((type, t) =>
        partNameIndexes[t].map(i => ({
          target: summary.attribute,
          abi: attributeAbi,
          fn: type,
          args: [i],
        })),
      ),
    ]),
  ]);
  const traits = allRead(traitResults, 'the art pages');
  const bgcolors = allRead(bgcolorResults, 'the backgrounds').map(result => result[0] as string);

  // The names found, keyed like "heads/12"
  const found = new Map<string, string>();
  const nameKeys = [
    ...bgNameIndexes.map(i => `backgrounds/${i}`),
    ...PART_TYPES.flatMap((type, t) => partNameIndexes[t].map(i => `${type}/${i}`)),
  ];
  names.forEach((result, i) => result?.[0] && found.set(nameKeys[i], result[0]));

  const images = await Promise.all(
    grown.map((type, i) => {
      const pages = traits[i][0].storagePages.map((page: StoragePage) => ({
        imageCount: Number(page.imageCount),
        decompressedLength: Number(page.decompressedLength),
        pointer: page.pointer,
      }));
      return readImages(provider, pages, art.images[type].length, counts[type]);
    }),
  );

  const paletteChanged = !samePalette(summary.palette, art.palette);
  if (!grown.length && !bgcolors.length && !found.size && !paletteChanged) return art;

  const updatedImages = { ...art.images };
  PART_TYPES.forEach(type => {
    const have = art.images[type];
    const named = have.map((part, i): EncodedImage => {
      const name = found.get(`${type}/${i}`);
      return name ? { filename: part.filename, name, data: part.data } : part;
    });
    const added = (images[grown.indexOf(type)] ?? []).map((data, j): EncodedImage => {
      const name = found.get(`${type}/${have.length + j}`);
      return { filename: toFilename(type, have.length + j, name), ...(name ? { name } : {}), data };
    });
    updatedImages[type] = [...named, ...added];
  });
  const allBgcolors = [...art.bgcolors, ...bgcolors];

  return {
    bgcolors: allBgcolors,
    bgnames: allBgcolors.map((_, i) => art.bgnames[i] || found.get(`backgrounds/${i}`) || ''),
    palette: paletteChanged ? summary.palette : art.palette,
    images: updatedImages,
  };
};

/**
 * All the art on chain: palette, backgrounds, every part's image and every trait's name, in the format of
 * the bundled `ImageData`.
 * @param provider A JSON-RPC connection
 * @param descriptor The AlpsDescriptorV2 address
 */
export const readArt = async (provider: ArtProvider, descriptor: string): Promise<ArtData> =>
  readArtUpdates(provider, descriptor, await readArtSummary(provider, descriptor));
