import Modal from '../Modal';
import { isInIframe } from '../../utils/safeAppConnector';
import { useInjectedWallets } from '../../utils/injectedWallets';
import classes from './WalletConnectModal.module.css';
import { Trans } from '@lingui/macro';
import React, { ReactNode, useContext } from 'react';
import { WalletContext } from '../../contexts/WalletContext';
import walletConnectLogo from '../../assets/wallet-brand-assets/walletconnect-logo.svg';
import safeLogo from '../../assets/wallet-brand-assets/safe.svg';
import metamaskLogo from '../../assets/wallet-brand-assets/metamask-fox.svg';

const WalletOption: React.FC<{
  icon: ReactNode;
  name: ReactNode;
  detail?: ReactNode;
  onClick: () => void;
}> = ({ icon, name, detail, onClick }) => (
  <button type="button" className={classes.option} onClick={onClick}>
    <span className={classes.icon}>{icon}</span>
    <span className={classes.label}>
      <span className={classes.name}>{name}</span>
      {detail && <span className={classes.detail}>{detail}</span>}
    </span>
  </button>
);

/**
 * Lists the wallets actually installed in this browser (EIP-6963), so e.g. Rainbow's or Zerion's
 * in-app browser shows up as itself, then WalletConnect for everything else.
 */
const WalletConnectModal: React.FC<{ onDismiss: () => void }> = props => {
  const { onDismiss } = props;
  const { connect } = useContext(WalletContext);
  const injectedWallets = useInjectedWallets();

  const wallets = (
    <div className={classes.options}>
      {isInIframe() && (
        <WalletOption
          icon={<img src={safeLogo} alt="" />}
          name="Safe"
          detail={<Trans>This Safe</Trans>}
          onClick={() => connect?.('safe')}
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
          onClick={() => connect?.('injected', { walletId: wallet.id })}
        />
      ))}
      <WalletOption
        icon={<img src={walletConnectLogo} alt="" />}
        name="WalletConnect"
        detail={<Trans>Rainbow, Zerion, Safe, Ledger Live and other mobile wallets</Trans>}
        onClick={() => connect?.('walletconnect')}
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
