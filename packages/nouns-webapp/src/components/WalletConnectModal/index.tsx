import Modal from '../Modal';
import WalletButton from '../WalletButton';
import { WALLET_TYPE } from '../WalletButton';
import clsx from 'clsx';
import { isInIframe } from '../../utils/safeAppConnector';
import classes from './WalletConnectModal.module.css';
import { Trans } from '@lingui/macro';
import { useContext } from 'react';
import { WalletContext } from '../../contexts/WalletContext';

const WalletConnectModal: React.FC<{ onDismiss: () => void }> = props => {
  const { onDismiss } = props;
  const { connect } = useContext(WalletContext);

  const wallets = (
    <div className={classes.walletConnectModal}>
      {isInIframe() && (
        <WalletButton onClick={() => connect?.('safe')} walletType={WALLET_TYPE.safe} />
      )}
      <WalletButton onClick={() => connect?.('injected')} walletType={WALLET_TYPE.metamask} />
      <WalletButton onClick={() => connect?.('fortmatic')} walletType={WALLET_TYPE.fortmatic} />
      <WalletButton
        onClick={() => connect?.('walletconnect')}
        walletType={WALLET_TYPE.walletconnect}
      />
      <WalletButton onClick={() => connect?.('coinbase')} walletType={WALLET_TYPE.coinbaseWallet} />
      <WalletButton onClick={() => connect?.('injected')} walletType={WALLET_TYPE.brave} />
      {/* <WalletButton
        onClick={() => {
          const ledger = new LedgerConnector({
            //TODO: refactor
            chainId: config.supportedChainId,
            url: config.rinkebyJsonRpc,
          });
          activate(ledger);
        }}
        walletType={WALLET_TYPE.ledger}
      /> */}
      <WalletButton onClick={() => connect?.('trezor')} walletType={WALLET_TYPE.trezor} />
      <div
        className={clsx(classes.clickable, classes.walletConnectData)}
        onClick={() => localStorage.removeItem('walletconnect')}
      >
        <Trans>Clear WalletConnect Data</Trans>
      </div>
    </div>
  );
  return (
    <Modal title={<Trans>Connect your wallet</Trans>} content={wallets} onDismiss={onDismiss} />
  );
};
export default WalletConnectModal;
