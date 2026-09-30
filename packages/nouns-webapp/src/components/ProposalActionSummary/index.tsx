import React, { Fragment, useState } from 'react';
import { BigNumber, constants, utils } from 'ethers';
import { Plural, Trans } from '@lingui/macro';
import clsx from 'clsx';
import { buildEtherscanAddressLink } from '../../utils/etherscan';
import { useReverseENSLookUp } from '../../utils/ensLookup';
import { containsBlockedText } from '../../utils/moderation/containsBlockedText';
import { decodeAction, DecodedAction } from '../../utils/proposalActions/decode';
import {
  formatEth,
  formatInteger,
  formatUnitsReadable,
  ProposalActionTx,
} from '../../utils/proposalActions/encoding';
import { knownContract, sameAddress, TREASURY_ADDRESS } from '../../utils/proposalActions/contracts';
import { useTokenInfo } from '../../hooks/useTokenInfo';
import { AVERAGE_BLOCK_TIME_IN_SECS } from '../../utils/constants';
import classes from './ProposalActionSummary.module.css';

export const KnownContractName: React.FC<{ address: string }> = ({ address }) => {
  switch (knownContract(address)) {
    case 'treasury':
      return <Trans>Alps treasury</Trans>;
    case 'token':
      return <Trans>Alps token</Trans>;
    case 'auctionHouse':
      return <Trans>Alps auction house</Trans>;
    case 'governor':
      return <Trans>Alps governor</Trans>;
    case 'weth':
      return <>WETH</>;
    case 'usdc':
      return <>USDC</>;
    case 'steth':
      return <>stETH</>;
    default:
      return null;
  }
};

const checksummed = (address: string) => (utils.isAddress(address) ? utils.getAddress(address) : address);
const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** An address as a person would say it: a known contract, the ENS name, or a short address. */
export const AddressLabel: React.FC<{ address: string; name?: string; full?: boolean }> = ({
  address,
  name,
  full,
}) => {
  const ens = useReverseENSLookUp(address);
  const safeEns = ens && !containsBlockedText(ens, 'en') ? ens : undefined;
  const display = checksummed(address);
  const label = knownContract(address) ? (
    <KnownContractName address={address} />
  ) : (
    name ?? safeEns ?? (full ? display : shortAddress(display))
  );
  return (
    <a
      className={classes.address}
      href={buildEtherscanAddressLink(address)}
      target="_blank"
      rel="noreferrer"
      title={display}
    >
      {label}
    </a>
  );
};

/** A duration in the largest unit that reads well: "90 seconds", "3 minutes", "4.2 days". */
export const Duration: React.FC<{ seconds: number }> = ({ seconds }) => {
  const round = (n: number) => Math.round(n * 10) / 10;
  if (seconds < 120) return <Plural value={seconds} one="# second" other="# seconds" />;
  if (seconds < 2 * 3600) {
    return <Plural value={round(seconds / 60)} one="# minute" other="# minutes" />;
  }
  if (seconds < 2 * 86400) {
    return <Plural value={round(seconds / 3600)} one="# hour" other="# hours" />;
  }
  return <Plural value={round(seconds / 86400)} one="# day" other="# days" />;
};

export const BlocksDuration: React.FC<{ blocks: number }> = ({ blocks }) => (
  <Duration seconds={blocks * AVERAGE_BLOCK_TIME_IN_SECS} />
);

/** "1,000 USDC", reading the token's symbol and decimals when it isn't one we know. */
export const TokenAmount: React.FC<{ token: string; amount: BigNumber }> = ({ token, amount }) => {
  const { info, loading } = useTokenInfo(token);
  if (info) {
    if (amount.eq(constants.MaxUint256)) {
      return (
        <Trans>
          unlimited <AddressLabel address={token} name={info.symbol} />
        </Trans>
      );
    }
    const formatted = formatUnitsReadable(amount, info.decimals, info.decimals);
    return (
      <>
        {formatted} <AddressLabel address={token} name={info.symbol} />
      </>
    );
  }
  const units = formatInteger(amount);
  if (loading) return <>{units}</>;
  return (
    <Trans>
      {units} base units of token <AddressLabel address={token} />
    </Trans>
  );
};

const bpsPercent = (bps: BigNumber) => {
  const n = bps.toNumber();
  return `${Math.round(n) / 100}%`;
};

const Sentence: React.FC<{ decoded: DecodedAction; names?: Record<string, string> }> = ({
  decoded,
  names,
}) => {
  const { intent, target, fragment } = decoded;
  const label = (address: string) => (
    <AddressLabel address={address} name={names?.[address.toLowerCase()]} />
  );

  switch (intent.type) {
    case 'eth-transfer': {
      const amount = formatEth(intent.amount);
      return <Trans>Send {amount} ETH from the treasury to {label(intent.to)}</Trans>;
    }
    case 'token-transfer':
      return (
        <Trans>
          Send <TokenAmount token={intent.token} amount={intent.amount} /> from the treasury to{' '}
          {label(intent.to)}
        </Trans>
      );
    case 'token-approve':
      return (
        <Trans>
          Allow {label(intent.spender)} to spend{' '}
          <TokenAmount token={intent.token} amount={intent.amount} /> from the treasury
        </Trans>
      );
    case 'weth-wrap': {
      const amount = formatEth(intent.amount);
      return <Trans>Wrap {amount} ETH from the treasury into WETH</Trans>;
    }
    case 'weth-unwrap': {
      const amount = formatEth(intent.amount);
      return <Trans>Unwrap {amount} of the treasury's WETH into ETH</Trans>;
    }
    case 'alp-transfer': {
      const alpId = intent.alpId.toString();
      if (sameAddress(intent.from, TREASURY_ADDRESS)) {
        return <Trans>Send Alp {alpId} from the treasury to {label(intent.to)}</Trans>;
      }
      return (
        <Trans>
          Move Alp {alpId} from {label(intent.from)} to {label(intent.to)}
        </Trans>
      );
    }
    case 'auction-reserve-price': {
      const amount = formatEth(intent.value);
      return <Trans>Set the auction reserve price to {amount} ETH</Trans>;
    }
    case 'auction-time-buffer': {
      const seconds = intent.value.toNumber();
      return (
        <Trans>
          Set the auction time buffer to <Duration seconds={seconds} />
        </Trans>
      );
    }
    case 'auction-min-bid-increment': {
      const percent = intent.value.toString();
      return <Trans>Set the minimum bid increase to {percent}%</Trans>;
    }
    case 'auction-pause':
      return <Trans>Pause the auctions</Trans>;
    case 'auction-unpause':
      return <Trans>Resume the auctions</Trans>;
    case 'voting-delay': {
      const blocks = formatInteger(intent.value);
      return (
        <Trans>
          Set the voting delay to {blocks} blocks (about <BlocksDuration blocks={intent.value.toNumber()} />)
        </Trans>
      );
    }
    case 'voting-period': {
      const blocks = formatInteger(intent.value);
      return (
        <Trans>
          Set the voting period to {blocks} blocks (about <BlocksDuration blocks={intent.value.toNumber()} />)
        </Trans>
      );
    }
    case 'proposal-threshold': {
      const bps = intent.value.toString();
      const percent = bpsPercent(intent.value);
      return (
        <Trans>
          Set the proposal threshold to {bps} basis points ({percent} of all Alps)
        </Trans>
      );
    }
    case 'quorum': {
      const bps = intent.value.toString();
      const percent = bpsPercent(intent.value);
      return (
        <Trans>
          Set the quorum to {bps} basis points ({percent} of all Alps)
        </Trans>
      );
    }
    case 'timelock-delay': {
      const seconds = intent.value.toNumber();
      return (
        <Trans>
          Set the treasury's execution delay to <Duration seconds={seconds} />
        </Trans>
      );
    }
    case 'call': {
      const name = fragment?.name ?? '';
      return (
        <Trans>
          Call <code className={classes.code}>{name}</code> on {label(target)}
        </Trans>
      );
    }
    case 'raw-call':
      return <Trans>Call {label(target)} with raw calldata</Trans>;
    case 'undecodable': {
      const signature = decoded.tx.signature;
      return (
        <Trans>
          Call <code className={classes.code}>{signature}</code> on {label(target)}, with data that
          doesn't match that signature
        </Trans>
      );
    }
  }
};

// Intents whose sentence already covers the ETH sent
const INCLUDES_VALUE = ['eth-transfer', 'weth-wrap'];

/** One plain-English line for an action, the same on the builder and the proposal page. */
export const ActionSummary: React.FC<{
  tx: ProposalActionTx;
  names?: Record<string, string>;
  className?: string;
}> = ({ tx, names, className }) => {
  const decoded = decodeAction(tx);
  const value = decoded.value;
  const sendsValue = value.gt(0) && !INCLUDES_VALUE.includes(decoded.intent.type);
  const amount = formatEth(value);
  return (
    <span className={clsx(classes.summary, className)}>
      <Sentence decoded={decoded} names={names} />
      {sendsValue && (
        <>
          {', '}
          <Trans>sending {amount} ETH with it</Trans>
        </>
      )}
      {decoded.isRawCalldata && decoded.intent.type !== 'raw-call' && (
        <span className={classes.tag}>
          <Trans>raw calldata</Trans>
        </span>
      )}
    </span>
  );
};

const ArgValue: React.FC<{ param: utils.ParamType; value: any }> = ({ param, value }) => {
  if (param.baseType === 'array' || param.baseType === 'tuple') {
    const children: utils.ParamType[] =
      param.baseType === 'tuple'
        ? param.components
        : (value as any[]).map(() => param.arrayChildren);
    const [open, close] = param.baseType === 'tuple' ? ['(', ')'] : ['[', ']'];
    return (
      <>
        {open}
        {children.map((child, i) => (
          <Fragment key={i}>
            {i > 0 && ', '}
            {child.name && param.baseType === 'tuple' && `${child.name}: `}
            <ArgValue param={child} value={value[i]} />
          </Fragment>
        ))}
        {close}
      </>
    );
  }
  if (param.baseType === 'address') return <AddressLabel address={value} full />;
  if (BigNumber.isBigNumber(value)) {
    return <>{value.toString()}</>;
  }
  if (typeof value === 'boolean') return <>{value ? 'true' : 'false'}</>;
  if (param.baseType === 'string') return <>{JSON.stringify(value)}</>;
  return <>{String(value)}</>;
};

/** The action exactly as it will be stored and executed, with its arguments decoded. */
export const ActionDetails: React.FC<{ tx: ProposalActionTx }> = ({ tx }) => {
  const decoded = decodeAction(tx);
  const { fragment, args, value } = decoded;
  return (
    <dl className={classes.details}>
      <dt>
        <Trans>Target</Trans>
      </dt>
      <dd>
        <a href={buildEtherscanAddressLink(tx.target)} target="_blank" rel="noreferrer">
          <code className={classes.hex}>{checksummed(tx.target)}</code>
        </a>
        {knownContract(tx.target) && (
          <span className={classes.muted}>
            {' '}
            (<KnownContractName address={tx.target} />)
          </span>
        )}
      </dd>
      <dt>
        <Trans>Value</Trans>
      </dt>
      <dd>
        {value.isZero() ? <Trans>None</Trans> : <>{formatEth(value, 18)} ETH</>}
        {!value.isZero() && <span className={classes.muted}> ({value.toString()} wei)</span>}
      </dd>
      <dt>
        <Trans>Function</Trans>
      </dt>
      <dd>
        {tx.signature ? (
          <code className={classes.hex}>{tx.signature}</code>
        ) : decoded.isRawCalldata ? (
          <span className={classes.muted}>
            <Trans>None: the calldata below includes its own function selector</Trans>
            {fragment && (
              <>
                {' '}
                (<Trans>matches</Trans> <code className={classes.hex}>{fragment.format()}</code>)
              </>
            )}
          </span>
        ) : (
          <span className={classes.muted}>
            <Trans>None: a plain ETH transfer</Trans>
          </span>
        )}
      </dd>
      {fragment && args && fragment.inputs.length > 0 && (
        <>
          <dt>
            <Trans>Arguments</Trans>
          </dt>
          <dd>
            <ol className={classes.args}>
              {fragment.inputs.map((input, i) => (
                <li key={i}>
                  <span className={classes.muted}>
                    {input.name ? `${input.name} (${input.format()})` : input.format()}
                  </span>{' '}
                  <span className={classes.argValue}>
                    <ArgValue param={input} value={args[i]} />
                  </span>
                </li>
              ))}
            </ol>
          </dd>
        </>
      )}
      <dt>
        <Trans>Calldata</Trans>
      </dt>
      <dd>
        {!tx.calldata || tx.calldata === '0x' ? (
          <span className={classes.muted}>
            <Trans>None</Trans>
          </span>
        ) : (
          <code className={clsx(classes.hex, classes.calldata)}>{tx.calldata}</code>
        )}
      </dd>
    </dl>
  );
};

/** A numbered action with its summary, and its exact data one click away. */
export const ProposalActionCard: React.FC<{
  index: number;
  tx: ProposalActionTx;
  names?: Record<string, string>;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ index, tx, names, actions, footer, defaultOpen }) => {
  const decoded = decodeAction(tx);
  // Calls we can't put in plain words show their data up front
  const opaque = ['call', 'raw-call', 'undecodable'].includes(decoded.intent.type);
  const [open, setOpen] = useState(defaultOpen ?? opaque);
  return (
    <div className={classes.card}>
      <div className={classes.cardHeader}>
        <span className={classes.index}>{index + 1}</span>
        <div className={classes.cardBody}>
          <ActionSummary tx={tx} names={names} />
          <button type="button" className={classes.toggle} onClick={() => setOpen(o => !o)}>
            {open ? <Trans>Hide transaction data</Trans> : <Trans>Show transaction data</Trans>}
          </button>
        </div>
        {actions && <div className={classes.cardActions}>{actions}</div>}
      </div>
      {open && <ActionDetails tx={tx} />}
      {footer}
    </div>
  );
};
