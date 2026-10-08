// Edits the live list of flagged wallets (served at alps.wtf/flagged.json from Cloudflare KV, see
// functions/flagged.json.ts at the repo root). Changes show on the site and in the Discord bot within
// about a minute; no rebuild needed.
//
//   node scripts/flags.mjs list
//   node scripts/flags.mjs add <address> "<reason>"   reason completes "flagged for …"
//   node scripts/flags.mjs remove <address>
//
// Needs CLOUDFLARE_API_TOKEN (with Workers KV Storage: Edit) and CLOUDFLARE_ACCOUNT_ID in the environment.

import { readFileSync } from 'fs';
import { utils } from 'ethers';

const NAMESPACE = 'alps-flags';
const KEY = 'flagged';

const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
if (!token || !account) {
  console.error('Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID first');
  process.exit(1);
}

const api = async (path, init = {}) => {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  return response;
};

const namespaceId = async () => {
  const body = await (await api('/storage/kv/namespaces?per_page=100')).json();
  if (!body.success) throw new Error(`Cloudflare: ${JSON.stringify(body.errors)}`);
  const namespace = body.result.find(n => n.title === NAMESPACE);
  if (!namespace) throw new Error(`No KV namespace called ${NAMESPACE}`);
  return namespace.id;
};

// KV holds nothing until the first edit: start from the copy built into the site
const builtIn = () =>
  JSON.parse(readFileSync(new URL('../src/utils/moderation/flagged.json', import.meta.url)));

const read = async ns => {
  const response = await api(`/storage/kv/namespaces/${ns}/values/${KEY}`);
  if (response.status === 404) return builtIn();
  if (!response.ok) throw new Error(`Cloudflare: ${response.status} ${await response.text()}`);
  return JSON.parse(await response.text());
};

const write = async (ns, list) => {
  const response = await api(`/storage/kv/namespaces/${ns}/values/${KEY}`, {
    method: 'PUT',
    headers: { 'content-type': 'text/plain' },
    body: JSON.stringify(list, null, 2) + '\n',
  });
  const body = await response.json();
  if (!body.success) throw new Error(`Cloudflare: ${JSON.stringify(body.errors)}`);
};

const show = list =>
  list.wallets.forEach(w => console.log(`${w.address}  flagged for ${w.reason}  (${w.flagged})`));

const [command, rawAddress, reason] = process.argv.slice(2);
const ns = await namespaceId();
const list = await read(ns);

if (command === 'list') {
  show(list);
} else if (command === 'add' || command === 'remove') {
  if (!utils.isAddress(rawAddress ?? '')) throw new Error(`Not an address: ${rawAddress}`);
  const address = utils.getAddress(rawAddress);
  const existing = list.wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
  if (command === 'add') {
    if (!reason?.trim()) throw new Error('Give a reason, completing "flagged for …"');
    if (existing) existing.reason = reason.trim();
    else
      list.wallets.push({
        address,
        reason: reason.trim(),
        flagged: new Date().toISOString().slice(0, 10),
      });
  } else {
    if (!existing) throw new Error(`${address} isn't flagged`);
    list.wallets = list.wallets.filter(w => w !== existing);
  }
  await write(ns, list);
  show(list);
} else {
  console.error('Usage: node scripts/flags.mjs list | add <address> "<reason>" | remove <address>');
  process.exit(1);
}
