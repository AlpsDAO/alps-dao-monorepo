import { keccak256 as solidityKeccak256 } from '@ethersproject/solidity';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { AlpSeed, AlpData, ArtData, ArtCounts } from './types';
import imageData from './image-data.json';

/** The art bundled with this package, synced from the chain by `yarn sync-traits` */
export const ImageData: ArtData = imageData;

/**
 * Count the traits in some art
 * @param art The art, the bundled `ImageData` by default
 */
export const getArtCounts = (art: ArtData = ImageData): ArtCounts => ({
  backgrounds: art.bgcolors.length,
  bodies: art.images.bodies.length,
  accessories: art.images.accessories.length,
  heads: art.images.heads.length,
  glasses: art.images.glasses.length,
});

/**
 * Get encoded part and background information using a Alp seed
 * @param seed The Alp seed
 * @param art The art to draw from, the bundled `ImageData` by default
 */
export const getAlpData = (seed: AlpSeed, art: ArtData = ImageData): AlpData => {
  const { bodies, accessories, heads, glasses } = art.images;
  return {
    parts: [
      bodies[seed.body],
      accessories[seed.accessory],
      heads[seed.head],
      glasses[seed.glasses],
    ],
    background: art.bgcolors[seed.background],
  };
};

/**
 * Generate a random Alp seed
 * @param art The art to pick traits from, the bundled `ImageData` by default
 */
export const getRandomAlpSeed = (art: ArtData = ImageData): AlpSeed => {
  const counts = getArtCounts(art);
  return {
    background: Math.floor(Math.random() * counts.backgrounds),
    body: Math.floor(Math.random() * counts.bodies),
    accessory: Math.floor(Math.random() * counts.accessories),
    head: Math.floor(Math.random() * counts.heads),
    glasses: Math.floor(Math.random() * counts.glasses),
  };
};

/**
 * Emulate bitwise right shift and uint cast
 * @param value A Big Number
 * @param shiftAmount The amount to right shift
 * @param uintSize The uint bit size to cast to
 */
export const shiftRightAndCast = (
  value: BigNumberish,
  shiftAmount: number,
  uintSize: number,
): string => {
  const shifted = BigNumber.from(value).shr(shiftAmount).toHexString();
  return `0x${shifted.substring(shifted.length - uintSize / 4)}`;
};

/**
 * Emulates the AlpsSeeder.sol methodology for pseudorandomly selecting a part
 * @param pseudorandomness Hex representation of a number
 * @param partCount The number of parts to pseudorandomly choose from
 * @param shiftAmount The amount to right shift
 * @param uintSize The size of the unsigned integer
 */
export const getPseudorandomPart = (
  pseudorandomness: string,
  partCount: number,
  shiftAmount: number,
  uintSize = 48,
): number => {
  const hex = shiftRightAndCast(pseudorandomness, shiftAmount, uintSize);
  return BigNumber.from(hex).mod(partCount).toNumber();
};

/**
 * Emulates the AlpsSeeder.sol methodology for generating a Alp seed
 * @param alpId The Alp tokenId used to create pseudorandomness
 * @param blockHash The block hash use to create pseudorandomness
 * @param counts The trait counts the seeder reads from the descriptor, the bundled art's by default
 */
export const getAlpSeedFromBlockHash = (
  alpId: BigNumberish,
  blockHash: string,
  counts: ArtCounts = getArtCounts(ImageData),
): AlpSeed => {
  const pseudorandomness = solidityKeccak256(['bytes32', 'uint256'], [blockHash, alpId]);
  return {
    background: getPseudorandomPart(pseudorandomness, counts.backgrounds, 0),
    body: getPseudorandomPart(pseudorandomness, counts.bodies, 48),
    accessory: getPseudorandomPart(pseudorandomness, counts.accessories, 96),
    head: getPseudorandomPart(pseudorandomness, counts.heads, 144),
    glasses: getPseudorandomPart(pseudorandomness, counts.glasses, 192),
  };
};
