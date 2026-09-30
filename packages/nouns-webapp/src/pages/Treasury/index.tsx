import React, { useEffect, useMemo, useState } from 'react';
import { Col, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import { Trans } from '@lingui/macro';
import { BigNumber as EthersBN, Contract, utils } from 'ethers';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Section from '../../layout/Section';
import config, { ETHERSCAN_API_KEY } from '../../config';
import { usePublicProvider } from '../../hooks/usePublicProvider';
import useChainlinkEthToUsd from '../../hooks/useChainlinkEthToUsd';
import { ProposalState, useAllProposals } from '../../wrappers/alpsDao';
import ShortAddress from '../../components/ShortAddress';
import { StandaloneAlpRoundedCorners } from '../../components/StandaloneAlp';
import { buildEtherscanAddressLink, buildEtherscanHoldingsLink } from '../../utils/etherscan';
import classes from './Treasury.module.css';

dayjs.extend(relativeTime);

const TREASURY = config.addresses.alpsDaoExecutor;

// Tokens worth showing by name. Anything else sent to the treasury is only counted: unknown tokens are
// often spam, and some carry scam links in their names.
const KNOWN_TOKENS: { symbol: string; name: string; address: string; decimals: number; price: 'eth' | 'usd' | 'wsteth' | 'reth' }[] = [
  { symbol: 'stETH', name: 'Lido staked ETH', address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', decimals: 18, price: 'eth' },
  { symbol: 'WETH', name: 'Wrapped ETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, price: 'eth' },
  { symbol: 'wstETH', name: 'Wrapped staked ETH', address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', decimals: 18, price: 'wsteth' },
  { symbol: 'rETH', name: 'Rocket Pool ETH', address: '0xae78736Cd615f374D3085123A210448E74Fc6393', decimals: 18, price: 'reth' },
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, price: 'usd' },
  { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, price: 'usd' },
  { symbol: 'DAI', name: 'Dai', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, price: 'usd' },
];

const erc20Abi = ['function balanceOf(address) view returns (uint256)'];

interface Holding {
  symbol: string;
  name: string;
  amount: number;
  /** in ETH, when it has an ETH price */
  eth?: number;
  /** in USD, for stablecoins */
  usd?: number;
}

/** What the treasury holds: ETH and the tokens above, valued in ETH (or USD for stablecoins). */
const useHoldings = () => {
  const provider = usePublicProvider();
  const [holdings, setHoldings] = useState<Holding[]>();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [eth, balances, wstethRate, rethRate] = await Promise.all([
        provider.getBalance(TREASURY),
        Promise.all(
          KNOWN_TOKENS.map(t =>
            new Contract(t.address, erc20Abi, provider).balanceOf(TREASURY).catch(() => EthersBN.from(0)),
          ),
        ),
        new Contract('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', ['function stEthPerToken() view returns (uint256)'], provider)
          .stEthPerToken()
          .catch(() => undefined),
        new Contract('0xae78736Cd615f374D3085123A210448E74Fc6393', ['function getExchangeRate() view returns (uint256)'], provider)
          .getExchangeRate()
          .catch(() => undefined),
      ]);
      const rate = (r: EthersBN | undefined) => (r ? Number(utils.formatEther(r)) : undefined);
      const list: Holding[] = [{ symbol: 'ETH', name: 'Ether', amount: Number(utils.formatEther(eth)), eth: Number(utils.formatEther(eth)) }];
      KNOWN_TOKENS.forEach((t, i) => {
        const amount = Number(utils.formatUnits(balances[i], t.decimals));
        if (!amount) return;
        const perToken = t.price === 'eth' ? 1 : t.price === 'wsteth' ? rate(wstethRate) : t.price === 'reth' ? rate(rethRate) : undefined;
        list.push({
          symbol: t.symbol,
          name: t.name,
          amount,
          eth: perToken !== undefined ? amount * perToken : undefined,
          usd: t.price === 'usd' ? amount : undefined,
        });
      });
      if (!cancelled) setHoldings(list);
    })().catch(() => !cancelled && setHoldings([]));
    return () => {
      cancelled = true;
    };
  }, [provider]);
  return holdings;
};

interface NftCollection {
  contract: string;
  name: string;
  standard: 'erc721' | 'erc1155';
  tokenIds: string[];
  /** minted straight to the treasury, or sent by the DAO's own wallets, rather than by a stranger */
  trusted: boolean;
}

// The DAO's own wallets: the deployer, the founders' (Alpers DAO) and Council multisigs, the treasury
const DAO_WALLETS = [
  '0xef60fb8d56962277aed8db6d6625b1ac7767fd08',
  '0x7f0fb27a2673adc49d583aeb6e5f799e7d7dc16f',
  '0x6f895becd7bf90a5c7d1766a1eca13b1d087de05',
  TREASURY.toLowerCase(),
  '0x0000000000000000000000000000000000000000',
];

interface Received {
  /** unrecognised ERC-20s still held */
  unknownTokens: number;
  /** NFTs still held (other than Alps), by collection */
  nfts: NftCollection[];
  /** NFT collections held whose names look like spam */
  spamCollections: number;
}

// Unsolicited NFTs that advertise a website or a "claim" in their name are phishing
const looksLikeSpam = (name: string) =>
  /(\.(com|io|xyz|org|net|app|finance|site|club|gift|link|pro|fi|co)\b|https?:|www\.|claim|reward|airdrop|visit|voucher|\$)/i.test(
    name,
  );

/** Other tokens and NFTs sent to the treasury, from Etherscan's transfer history. */
const useReceived = (): Received | undefined => {
  const provider = usePublicProvider();
  const [received, setReceived] = useState<Received>();
  useEffect(() => {
    if (!ETHERSCAN_API_KEY) return;
    let cancelled = false;
    const api = (action: string) =>
      fetch(
        `https://api.etherscan.io/v2/api?chainid=1&module=account&action=${action}&address=${TREASURY}&page=1&offset=1000&sort=asc&apikey=${ETHERSCAN_API_KEY}`,
      )
        .then(r => r.json())
        .then(r => (Array.isArray(r.result) ? r.result : []));
    (async () => {
      const [tokenTxs, nftTxs, multiTxs] = await Promise.all([api('tokentx'), api('tokennfttx'), api('token1155tx')]);
      const known = new Set(KNOWN_TOKENS.map(t => t.address.toLowerCase()));
      const unknown = Array.from(new Set<string>(tokenTxs.map((t: any) => t.contractAddress.toLowerCase()))).filter(a => !known.has(a));
      const held = await Promise.all(
        unknown.map(a => new Contract(a, erc20Abi, provider).balanceOf(TREASURY).then((b: EthersBN) => b.gt(0)).catch(() => false)),
      );
      // NFTs still held: received minus sent, per token (ERC-1155 by balance)
      const owned = new Map<string, { contract: string; name: string; standard: NftCollection['standard']; tokenId: string; amount: number; trusted: boolean }>();
      const track = (list: any[], standard: NftCollection['standard']) => {
        for (const t of list) {
          const key = `${t.contractAddress.toLowerCase()}:${t.tokenID}`;
          const entry = owned.get(key) ?? {
            contract: t.contractAddress,
            name: t.tokenName || t.tokenSymbol || 'Unnamed collection',
            standard,
            tokenId: t.tokenID,
            amount: 0,
            trusted: false,
          };
          const amount = standard === 'erc1155' ? Number(t.tokenValue || 1) : 1;
          if (t.to.toLowerCase() === TREASURY.toLowerCase()) {
            entry.amount += amount;
            entry.trusted = entry.trusted || DAO_WALLETS.includes(t.from.toLowerCase());
          }
          if (t.from.toLowerCase() === TREASURY.toLowerCase()) entry.amount -= amount;
          owned.set(key, entry);
        }
      };
      track(nftTxs, 'erc721');
      track(multiTxs, 'erc1155');
      const byContract = new Map<string, NftCollection>();
      owned.forEach(({ contract, name, standard, tokenId, amount, trusted }) => {
        // Alps are shown from the subgraph, with the site's own art
        if (amount <= 0 || contract.toLowerCase() === config.addresses.alpsToken.toLowerCase()) return;
        const entry = byContract.get(contract) ?? { contract, name: name.slice(0, 60), standard, tokenIds: [], trusted };
        entry.tokenIds.push(tokenId);
        entry.trusted = entry.trusted && trusted;
        byContract.set(contract, entry);
      });
      const collections = Array.from(byContract.values());
      if (!cancelled)
        setReceived({
          unknownTokens: held.filter(Boolean).length,
          nfts: collections.filter(c => !looksLikeSpam(c.name)),
          spamCollections: collections.filter(c => looksLikeSpam(c.name)).length,
        });
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [provider]);
  return received;
};

// Public IPFS gateways rate-limit and go down, so each is tried in turn
const IPFS_GATEWAYS = ['https://ipfs.filebase.io/ipfs/', 'https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/'];

/** Where to fetch a URI from, best first: every gateway for IPFS content, wherever it was pinned. */
const candidateUrls = (uri: string): string[] => {
  const ipfsPath = uri.startsWith('ipfs://') ? uri.slice(7).replace(/^ipfs\//, '') : /\/ipfs\/(.+)$/.exec(uri)?.[1];
  if (ipfsPath) return IPFS_GATEWAYS.map(g => g + ipfsPath);
  if (uri.startsWith('ar://')) return [`https://arweave.net/${uri.slice(5)}`];
  return [uri];
};

const fetchJson = async (uri: string) => {
  for (const url of candidateUrls(uri)) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {
      // try the next gateway
    }
  }
  throw new Error(`Couldn't load ${uri}`);
};

const nftMetadataAbi = ['function tokenURI(uint256) view returns (string)', 'function uri(uint256) view returns (string)'];

/** An NFT's name and image, from its own metadata (on-chain, IPFS or the web). */
const useNftMedia = (contract: string, tokenId: string, standard: NftCollection['standard']) => {
  const provider = usePublicProvider();
  const [media, setMedia] = useState<{ name?: string; image?: string; failed?: boolean }>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = new Contract(contract, nftMetadataAbi, provider);
      let uri: string =
        standard === 'erc1155' ? await token.uri(tokenId) : await token.tokenURI(tokenId);
      // ERC-1155 URIs hold {id} for the token id, as 64 hex digits
      uri = uri.replace('{id}', EthersBN.from(tokenId).toHexString().slice(2).padStart(64, '0'));
      const json = uri.startsWith('data:')
        ? JSON.parse(uri.includes(';base64,') ? atob(uri.split(',')[1]) : decodeURIComponent(uri.split(',')[1]))
        : await fetchJson(uri);
      const image = json.image || json.image_url;
      if (!cancelled) setMedia({ name: json.name, image: image ? String(image) : undefined });
    })().catch(() => !cancelled && setMedia({ failed: true }));
    return () => {
      cancelled = true;
    };
  }, [contract, tokenId, standard, provider]);
  return media;
};

/** An NFT image, moving on to the next gateway when one fails */
const NftImage: React.FC<{ uri: string; alt: string }> = ({ uri, alt }) => {
  const urls = useMemo(() => candidateUrls(uri), [uri]);
  const [attempt, setAttempt] = useState(0);
  if (attempt >= urls.length) return <span className={classes.muted}>{alt}</span>;
  return <img src={urls[attempt]} alt={alt} loading="lazy" onError={() => setAttempt(a => a + 1)} />;
};

const NftCard: React.FC<{ collection: NftCollection; tokenId: string }> = ({ collection, tokenId }) => {
  const media = useNftMedia(collection.contract, tokenId, collection.standard);
  const shortId = tokenId.length > 10 ? `${tokenId.slice(0, 6)}…` : tokenId;
  return (
    <a
      className={classes.nft}
      href={`https://etherscan.io/nft/${collection.contract}/${tokenId}`}
      target="_blank"
      rel="noreferrer"
      title={media.name ?? `#${tokenId}`}
    >
      <div className={classes.nftImage}>
        {media.image ? (
          <NftImage uri={media.image} alt={media.name ?? `#${shortId}`} />
        ) : media.failed ? (
          <span className={classes.muted}>#{shortId}</span>
        ) : (
          <Spinner animation="border" size="sm" />
        )}
      </div>
      <span className={classes.nftName}>{media.name ?? `#${shortId}`}</span>
    </a>
  );
};

const treasuryAlpsQuery = gql`
  query TreasuryAlps($owner: String!) {
    alps(where: { owner: $owner }, first: 100) {
      id
    }
  }
`;

const recentAuctionsQuery = gql`
  {
    auctions(where: { settled: true }, orderBy: endTime, orderDirection: desc, first: 8) {
      id
      amount
      endTime
      bidder {
        id
      }
    }
  }
`;

const payoutActionsQuery = gql`
  query PayoutActions($ids: [String!]) {
    proposals(where: { id_in: $ids }) {
      id
      targets
      values
      signatures
      calldatas
    }
  }
`;

const knownToken = (address: string) => KNOWN_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());

/** One action of a proposal as a payout: what leaves the treasury, and to whom. */
const Payout: React.FC<{ target: string; value: string; signature: string; calldata: string }> = ({ target, value, signature, calldata }) => {
  const eth = EthersBN.from(value || 0);
  const token = knownToken(target);
  if (token && signature === 'transfer(address,uint256)') {
    try {
      const [to, amount] = utils.defaultAbiCoder.decode(['address', 'uint256'], calldata);
      return (
        <>
          {Number(utils.formatUnits(amount, token.decimals)).toLocaleString()} {token.symbol} <Trans>to</Trans> <ShortAddress address={to} />
        </>
      );
    } catch {
      // fall through to the generic description
    }
  }
  if (!signature && (!calldata || calldata === '0x')) {
    return (
      <>
        Ξ {Number(utils.formatEther(eth)).toLocaleString()} <Trans>to</Trans> <ShortAddress address={target} />
      </>
    );
  }
  return (
    <>
      <Trans>Calls</Trans> <code>{signature ? signature.split('(')[0] : 'a function'}</code> <Trans>on</Trans>{' '}
      <ShortAddress address={target} />
      {eth.gt(0) && <> (Ξ {Number(utils.formatEther(eth)).toLocaleString()})</>}
    </>
  );
};

const fmt = (n: number, digits = 3) =>
  n > 0 && n < 10 ** -digits ? `< ${(10 ** -digits).toFixed(digits)}` : n.toLocaleString(undefined, { maximumFractionDigits: digits });

const usd = (n: number) => (n > 0 && n < 1 ? '< $1' : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

/**
 * The treasury: what it holds, what's waiting to be paid out, and what the latest auctions brought in,
 * with links out to block explorers for the full picture.
 */
const TreasuryPage = () => {
  const holdings = useHoldings();
  const received = useReceived();
  const { rate, decimals } = useChainlinkEthToUsd();
  const ethUsd = rate && decimals ? Number(utils.formatUnits(rate, decimals)) : undefined;

  const { data: proposals } = useAllProposals();
  const pending = (proposals ?? [])
    .filter(p => p.status === ProposalState.SUCCEEDED || p.status === ProposalState.QUEUED)
    .sort((a, b) => Number(a.id) - Number(b.id));
  const { data: payoutData } = useQuery(payoutActionsQuery, {
    variables: { ids: pending.map(p => p.id) },
    skip: !pending.length,
  });
  const { data: alpsData } = useQuery(treasuryAlpsQuery, { variables: { owner: TREASURY.toLowerCase() } });
  const { data: auctionsData } = useQuery(recentAuctionsQuery);

  const totalEth = useMemo(() => holdings?.reduce((sum, h) => sum + (h.eth ?? 0), 0), [holdings]);
  const totalUsd = holdings && ethUsd !== undefined ? (totalEth ?? 0) * ethUsd + holdings.reduce((sum, h) => sum + (h.usd ?? 0), 0) : undefined;
  const treasuryAlps: { id: string }[] = alpsData?.alps ?? [];

  const explorers = [
    { name: 'Etherscan', href: buildEtherscanAddressLink(TREASURY) },
    { name: 'Etherscan token holdings', href: buildEtherscanHoldingsLink(TREASURY) },
    { name: 'Blockscout', href: `https://eth.blockscout.com/address/${TREASURY}` },
  ];

  return (
    <Section fullWidth={false} className={classes.page}>
      <Col lg={{ span: 10, offset: 1 }}>
        <h1 className={classes.title}>
          <Trans>Treasury</Trans>
        </h1>
        <p className={classes.lead}>
          <Trans>
            The club treasury holds 100% of auction proceeds. It only pays out when a proposal passes, is
            queued, and waits out the 2-day delay.
          </Trans>
        </p>

        <div className={classes.totalCard}>
          <div>
            <div className={classes.label}>
              <Trans>Total value</Trans>
            </div>
            <div className={classes.total}>{totalEth !== undefined ? `Ξ ${fmt(totalEth)}` : <Spinner animation="border" size="sm" />}</div>
            {totalUsd !== undefined && <div className={classes.usd}>${fmt(totalUsd, 0)}</div>}
          </div>
          <div className={classes.addressBlock}>
            <div className={classes.label}>
              <Trans>Treasury address</Trans>
            </div>
            <code className={classes.address}>{TREASURY}</code>
            <div className={classes.explorers}>
              {explorers.map(e => (
                <a key={e.name} href={e.href} target="_blank" rel="noreferrer" className={classes.explorer}>
                  {e.name} ↗
                </a>
              ))}
            </div>
          </div>
        </div>

        <h2 className={classes.heading}>
          <Trans>What it holds</Trans>
        </h2>
        {!holdings ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <table className={classes.table}>
            <tbody>
              {holdings.map(h => (
                <tr key={h.symbol}>
                  <td>
                    <strong>{h.symbol}</strong> <span className={classes.muted}>{h.name}</span>
                  </td>
                  <td className={classes.num}>{fmt(h.amount, 4)}</td>
                  <td className={classes.num}>
                    {h.usd !== undefined
                      ? usd(h.usd)
                      : h.eth !== undefined && ethUsd !== undefined
                        ? usd(h.eth * ethUsd)
                        : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {received && received.unknownTokens + received.spamCollections > 0 && (
          <p className={classes.note}>
            <Trans>
              Plus {received.unknownTokens} unrecognised tokens and {received.spamCollections} NFT
              collections that look like spam, sent to the treasury by strangers. Some link to scams, so
              they aren't listed here.
            </Trans>{' '}
            <a href={buildEtherscanHoldingsLink(TREASURY)} target="_blank" rel="noreferrer">
              <Trans>See them on Etherscan ↗</Trans>
            </a>
          </p>
        )}

        {(treasuryAlps.length > 0 || (received && received.nfts.length > 0)) && (
          <>
            <h2 className={classes.heading}>
              <Trans>NFTs</Trans>
            </h2>
            {treasuryAlps.length > 0 && (
              <div className={classes.collection}>
                <h3 className={classes.subheading}>
                  Alps <span className={classes.muted}>× {treasuryAlps.length}</span>
                </h3>
                <div className={classes.nftGrid}>
                  {treasuryAlps.map(a => (
                    <div key={a.id} className={classes.nft}>
                      <StandaloneAlpRoundedCorners alpId={EthersBN.from(a.id)} />
                      <span className={classes.nftName}>Alp {a.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {received?.nfts.map(collection => (
              <div key={collection.contract} className={classes.collection}>
                <h3 className={classes.subheading}>
                  <a href={`https://etherscan.io/token/${collection.contract}?a=${TREASURY}`} target="_blank" rel="noreferrer">
                    {collection.name}
                  </a>{' '}
                  <span className={classes.muted}>× {collection.tokenIds.length}</span>{' '}
                  {!collection.trusted && (
                    <span className={classes.unverified} title="Sent to the treasury by someone outside the DAO">
                      <Trans>unverified</Trans>
                    </span>
                  )}
                </h3>
                <div className={classes.nftGrid}>
                  {collection.tokenIds.slice(0, 48).map(id => (
                    <NftCard key={id} collection={collection} tokenId={id} />
                  ))}
                </div>
                {collection.tokenIds.length > 48 && (
                  <p className={classes.note}>
                    <Trans>And {collection.tokenIds.length - 48} more on Etherscan.</Trans>
                  </p>
                )}
              </div>
            ))}
          </>
        )}

        <h2 className={classes.heading}>
          <Trans>Waiting to be paid out</Trans>
        </h2>
        {!pending.length ? (
          <p className={classes.note}>
            <Trans>Nothing right now. Payouts show here once a proposal passes.</Trans>
          </p>
        ) : (
          <ul className={classes.payouts}>
            {pending.map(p => {
              const actions = payoutData?.proposals?.find((x: any) => x.id === p.id);
              const eta = p.eta ? dayjs(p.eta) : undefined;
              const status =
                p.status === ProposalState.SUCCEEDED ? (
                  <Trans>Passed, waiting to be queued</Trans>
                ) : eta && eta.isAfter(dayjs()) ? (
                  <Trans>Queued, executable {eta.fromNow()}</Trans>
                ) : (
                  <Trans>Ready to execute</Trans>
                );
              return (
                <li key={p.id} className={classes.payout}>
                  <div className={classes.payoutHeader}>
                    <Link to={`/vote/${p.id}`}>
                      <strong>
                        <Trans>Prop {p.id}</Trans>
                      </strong>{' '}
                      {p.title}
                    </Link>
                    <span className={classes.pill}>{status}</span>
                  </div>
                  {actions && (
                    <ol className={classes.actions}>
                      {actions.targets.map((target: string, i: number) => (
                        <li key={i}>
                          <Payout target={target} value={actions.values[i]} signature={actions.signatures[i]} calldata={actions.calldatas[i]} />
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <h2 className={classes.heading}>
          <Trans>Latest auction income</Trans>
        </h2>
        {!auctionsData ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <table className={classes.table}>
            <tbody>
              {auctionsData.auctions.map((a: any) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/alp/${a.id}`}>Alp {a.id}</Link>{' '}
                    <span className={classes.muted}>{dayjs.unix(Number(a.endTime)).format('MMM D, YYYY')}</span>
                  </td>
                  <td className={classes.num}>
                    {EthersBN.from(a.amount).gt(0) ? `Ξ ${fmt(Number(utils.formatEther(a.amount)), 4)}` : <span className={classes.muted}><Trans>No bids</Trans></span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Col>
    </Section>
  );
};

export default TreasuryPage;
