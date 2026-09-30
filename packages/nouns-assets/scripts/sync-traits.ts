/// <reference lib="dom" />
import { getContractAddressesForChainOrThrow } from '@nouns/sdk';
import { promises as fs } from 'fs';
import path from 'path';
import { ArtProvider, PART_TYPES, readArt } from '../src/chain';
import { ArtData } from '../src/types';

/**
 * Regenerates src/image-data.json from the chain: palette, backgrounds, every part's image and every
 * trait's on-chain name. With --check it only reports, and exits 1 if the file isn't current.
 *
 * RPCs are tried in turn: SYNC_TRAITS_RPC, REACT_APP_MAINNET_JSONRPC, then two public ones.
 */

const DESTINATION = path.join(__dirname, '../src/image-data.json');
const DESCRIPTOR = getContractAddressesForChainOrThrow(1).alpsDescriptor;

const RPCS = [
  { label: 'SYNC_TRAITS_RPC', url: process.env.SYNC_TRAITS_RPC },
  { label: 'REACT_APP_MAINNET_JSONRPC', url: process.env.REACT_APP_MAINNET_JSONRPC },
  { label: 'publicnode', url: 'https://ethereum-rpc.publicnode.com' },
  { label: 'MEV Blocker', url: 'https://rpc.mevblocker.io' },
].filter((rpc): rpc is { label: string; url: string } => !!rpc.url);

/** A JSON-RPC connection that reads everything at one block, so the art comes from a single state */
const connect = async (url: string): Promise<ArtProvider> => {
  const send = async (method: string, params: unknown[]): Promise<string> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { result, error } = await response.json();
    if (error) throw new Error(error.message ?? JSON.stringify(error));
    return result;
  };
  const block = await send('eth_blockNumber', []);
  return {
    call: transaction => send('eth_call', [transaction, block]),
    getCode: address => send('eth_getCode', [address, block]),
  };
};

const readFromChain = async (): Promise<ArtData> => {
  for (const { label, url } of RPCS) {
    try {
      const art = await readArt(await connect(url), DESCRIPTOR);
      console.log(`Read the art from the chain via ${label}`);
      return art;
    } catch (error) {
      console.warn(`Couldn't read the art via ${label}: ${(error as Error).message}`);
    }
  }
  throw new Error('Every RPC failed');
};

const sync = async () => {
  const check = process.argv.includes('--check');
  const current = await fs.readFile(DESTINATION, 'utf8');
  const bundled: ArtData = JSON.parse(current);
  const chain = await readFromChain();

  // Filenames aren't on chain: keep the bundle's for the images it already has
  PART_TYPES.forEach(type =>
    chain.images[type].forEach((part, i) => {
      const old = bundled.images[type][i];
      if (old?.data === part.data) part.filename = old.filename;
    }),
  );

  const report = (label: string, have: string[], now: string[], names: string[] = now) => {
    const changed = have.filter((item, i) => i < now.length && item !== now[i]).length;
    const added = names.slice(have.length);
    console.log(
      `${label}: ${have.length} bundled, ${now.length} on chain` +
        (added.length ? `; new: ${added.join(', ')}` : ''),
    );
    if (changed)
      console.warn(`  ${changed} bundled ${label} differ from the chain's; using the chain's`);
    if (now.length < have.length) console.warn(`  the chain has fewer ${label} than the bundle`);
  };
  report('colours', bundled.palette, chain.palette);
  report('backgrounds', bundled.bgcolors, chain.bgcolors, chain.bgnames);
  PART_TYPES.forEach(type =>
    report(
      type,
      bundled.images[type].map(part => part.data),
      chain.images[type].map(part => part.data),
      chain.images[type].map(part => part.name ?? part.filename),
    ),
  );
  const unnamed = PART_TYPES.flatMap(type =>
    chain.images[type].filter(part => !part.name).map(part => part.filename),
  );
  if (unnamed.length || chain.bgnames.some(name => !name)) {
    console.warn(`Traits without a name on chain yet: ${unnamed.join(', ') || 'a background'}`);
  }

  const next = JSON.stringify(
    {
      bgcolors: chain.bgcolors,
      bgnames: chain.bgnames,
      palette: chain.palette,
      images: {
        bodies: chain.images.bodies,
        accessories: chain.images.accessories,
        heads: chain.images.heads,
        glasses: chain.images.glasses,
      },
    },
    null,
    2,
  );
  if (next === current) {
    console.log('image-data.json is current');
  } else if (check) {
    console.error('image-data.json is out of date: run `yarn workspace @nouns/assets sync-traits`');
    process.exitCode = 1;
  } else {
    await fs.writeFile(DESTINATION, next);
    console.log('Updated image-data.json');
  }
};

sync().catch(error => {
  console.error(error);
  process.exit(1);
});
