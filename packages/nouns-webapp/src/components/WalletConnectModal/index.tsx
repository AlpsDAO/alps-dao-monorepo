import Modal from '../Modal';
import { isInIframe } from '../../utils/safeAppConnector';
import { useInjectedWallets } from '../../utils/injectedWallets';
import classes from './WalletConnectModal.module.css';
import { Trans } from '@lingui/macro';
import React, { ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { WalletContext } from '../../contexts/WalletContext';
import walletConnectLogo from '../../assets/wallet-brand-assets/walletconnect-logo.svg';
import safeLogo from '../../assets/wallet-brand-assets/safe.svg';
import metamaskLogo from '../../assets/wallet-brand-assets/metamask-fox.svg';

type Attempt = { option: string; error?: ReactNode };

const WalletOption: React.FC<{
  icon: ReactNode;
  name: ReactNode;
  detail?: ReactNode;
  // This option's connection attempt: waiting while there's no error
  attempt?: Attempt;
  waiting?: ReactNode;
  onClick: () => void;
}> = ({ icon, name, detail, attempt, waiting, onClick }) => (
  <button type="button" className={classes.option} onClick={onClick}>
    <span className={classes.icon}>{icon}</span>
    <span className={classes.label}>
      <span className={classes.name}>{name}</span>
      {attempt?.error ? (
        <span className={classes.error} role="alert">
          {attempt.error}
        </span>
      ) : attempt ? (
        <span className={classes.detail} role="status">
          {waiting}
        </span>
      ) : (
        detail && <span className={classes.detail}>{detail}</span>
      )}
    </span>
  </button>
);

const errorMessage = (error: any): string =>
  (typeof error?.message === 'string' && error.message) || String(error);

// The user said no in their wallet, or closed the WalletConnect QR code
const isRejection = (error: any) => Number(error?.code) === 4001;
const isClosedQrCode = (error: any) => /connection request reset/i.test(errorMessage(error));

const describeError = (name: string, walletId: string | undefined, error: any): ReactNode => {
  // Frame's extension can't reach the Frame desktop app
  if (walletId === 'sh.frame' && /not connected/i.test(errorMessage(error))) {
    return <Trans>Couldn't reach Frame. Open the Frame app, then try again.</Trans>;
  }
  if (isRejection(error)) return <Trans>You declined the connection in {name}.</Trans>;
  const message = errorMessage(error);
  return (
    <Trans>
      {name} didn't connect: {message}
    </Trans>
  );
};

/**
 * Lists the wallets actually installed in this browser (EIP-6963), so e.g. Rainbow's or Zerion's
 * in-app browser shows up as itself, then WalletConnect for everything else.
 */
const WalletConnectModal: React.FC<{ onDismiss: () => void }> = props => {
  const { onDismiss } = props;
  const { connect } = useContext(WalletContext);
  const injectedWallets = useInjectedWallets();
  const [attempt, setAttempt] = useState<Attempt>();
  const latest = useRef(0);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  // Shows progress and errors on the clicked option, and closes once connected (a wrong network
  // shows its own alert). Only the latest click updates the dialog.
  const start = (
    option: string,
    name: string,
    run: () => Promise<boolean> | undefined,
    walletId?: string,
  ) => {
    const id = ++latest.current;
    const current = () => mounted.current && id === latest.current;
    setAttempt({ option });
    run()?.then(
      connected => {
        if (!current()) return;
        setAttempt(undefined);
        if (connected) onDismiss();
      },
      error => {
        console.warn(`${name} didn't connect`, error);
        if (!current()) return;
        setAttempt(
          isClosedQrCode(error)
            ? undefined
            : { option, error: describeError(name, walletId, error) },
        );
      },
    );
  };
  const attemptFor = (option: string) => (attempt?.option === option ? attempt : undefined);

  const wallets = (
    <div className={classes.options}>
      {isInIframe() && (
        <WalletOption
          icon={<img src={safeLogo} alt="" />}
          name="Safe"
          detail={<Trans>This Safe</Trans>}
          attempt={attemptFor('safe')}
          waiting={<Trans>Connecting…</Trans>}
          onClick={() => start('safe', 'Safe', () => connect?.('safe'))}
        />
      )}
      {injectedWallets.map(wallet => (
        <WalletOption
          key={wallet.id}
          icon={
            wallet.icon || wallet.name === 'MetaMask' ? (
              <img src={wallet.icon ?? metamaskLogo} alt="" />
            ) : (
              <span className={classes.initial} aria-hidden="true">
                {wallet.name[0]}
              </span>
            )
          }
          name={wallet.name}
          detail={<Trans>Detected in this browser</Trans>}
          attempt={attemptFor(wallet.id)}
          waiting={<Trans>Approve the connection in {wallet.name}…</Trans>}
          onClick={() =>
            start(
              wallet.id,
              wallet.name,
              () => connect?.('injected', { walletId: wallet.id }),
              wallet.id,
            )
          }
        />
      ))}
      <WalletOption
        icon={<img src={walletConnectLogo} alt="" />}
        name="WalletConnect"
        detail={<Trans>Rainbow, Zerion, Safe, Ledger Live and other mobile wallets</Trans>}
        attempt={attemptFor('walletconnect')}
        waiting={<Trans>Waiting for your wallet…</Trans>}
        onClick={() => start('walletconnect', 'WalletConnect', () => connect?.('walletconnect'))}
      />
      {!injectedWallets.length && !isInIframe() && (
        <p className={classes.hint}>
          <Trans>No browser wallet detected. Use WalletConnect to connect a wallet on your phone.</Trans>
        </p>
      )}
    </div>
  );
  return (
    <Modal title={<Trans>Connect your wallet</Trans>} content={wallets} onDismiss={onDismiss} />
  );
};
export default WalletConnectModal;
