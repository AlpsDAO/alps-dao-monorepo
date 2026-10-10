import React, { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faChevronRight,
  faGavel,
  faLandmark,
  faPlay,
  faUsers,
  IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import Davatar from '@davatar/react';
import { Trans } from '@lingui/macro';
import { i18n } from '@lingui/core';
import clsx from 'clsx';
import { useAppSelector } from '../../hooks';
import { WalletContext } from '../../contexts/WalletContext';
import { usePublicProvider } from '../../hooks/usePublicProvider';
import { useReverseENSLookUp } from '../../utils/ensLookup';
import { useShortAddress } from '../../utils/addressAndENSDisplayUtils';
import WalletConnectModal from '../WalletConnectModal';
import classes from './MobileMenu.module.css';

interface MenuLink {
  to: string;
  label: React.ReactNode;
  icon: IconDefinition;
  isCurrent: (path: string) => boolean;
  detail?: React.ReactNode;
}

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  // Where the header ends on screen: the menu opens just below it
  top: number;
  // ETH, formatted
  treasuryBalance?: string;
}

/**
 * The menu on phones and tablets: the pages as a list, the current one marked, and the wallet at the
 * bottom. It covers the page under the header and closes on a tap of a link, Escape, or the page changing.
 */
const MobileMenu: React.FC<MobileMenuProps> = ({ open, onClose, top, treasuryBalance }) => {
  const { pathname } = useLocation();
  const activeAccount = useAppSelector(state => state.account.activeAccount);
  const { deactivate } = useContext(WalletContext);
  const ens = useReverseENSLookUp(activeAccount ?? '');
  const shortAddress = useShortAddress(activeAccount ?? '');
  const publicProvider = usePublicProvider();
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Closes when the page changes, e.g. on the browser's back button
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    // The header switches to the full nav from 1200px wide
    const wide = window.matchMedia('(min-width: 1200px)');
    const onWide = () => wide.matches && onClose();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    wide.addEventListener?.('change', onWide);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKeyDown);
      wide.removeEventListener?.('change', onWide);
    };
  }, [open, onClose]);

  const links: MenuLink[] = [
    {
      to: '/',
      label: <Trans>Auction</Trans>,
      icon: faGavel,
      isCurrent: path => path === '/' || path.startsWith('/alp/'),
    },
    {
      to: '/vote',
      label: <Trans>Governance</Trans>,
      icon: faUsers,
      isCurrent: path =>
        path.startsWith('/vote') || path === '/create-proposal' || path === '/delegate',
    },
    {
      to: '/treasury',
      label: <Trans>Treasury</Trans>,
      icon: faLandmark,
      isCurrent: path => path === '/treasury',
      detail: treasuryBalance && <>Ξ {i18n.number(Number(treasuryBalance))}</>,
    },
    {
      to: '/about',
      label: <Trans>About</Trans>,
      icon: faBookOpen,
      isCurrent: path => path === '/about',
    },
    {
      to: '/playground',
      label: <Trans>Playground</Trans>,
      icon: faPlay,
      isCurrent: path => path === '/playground',
    },
  ];

  const connect = () => {
    onClose();
    setShowConnectModal(true);
  };

  const switchWallet = () => {
    deactivate?.();
    connect();
  };

  const disconnect = () => {
    onClose();
    deactivate?.();
  };

  const menu = open && (
    <div id="mobile-menu" className={classes.menu} style={{ top }}>
      <nav aria-label="Main">
        <ul className={classes.links}>
          {links.map(link => {
            const isCurrent = link.isCurrent(pathname);
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={onClose}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={clsx(classes.link, isCurrent && classes.current)}
                >
                  <FontAwesomeIcon icon={link.icon} className={classes.icon} fixedWidth />
                  <span className={classes.label}>{link.label}</span>
                  {link.detail && <span className={classes.detail}>{link.detail}</span>}
                  <FontAwesomeIcon icon={faChevronRight} className={classes.chevron} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={classes.wallet}>
        {activeAccount ? (
          <>
            <div className={classes.account}>
              <Davatar size={32} address={activeAccount} provider={publicProvider} />
              <span className={classes.accountName}>{ens ?? shortAddress}</span>
            </div>
            <div className={classes.walletActions}>
              <button type="button" className={classes.secondaryButton} onClick={switchWallet}>
                <Trans>Switch wallet</Trans>
              </button>
              <button
                type="button"
                className={clsx(classes.secondaryButton, classes.disconnect)}
                onClick={disconnect}
              >
                <Trans>Disconnect</Trans>
              </button>
            </div>
          </>
        ) : (
          <button type="button" className={classes.connectButton} onClick={connect}>
            <Trans>Connect wallet</Trans>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {menu && createPortal(menu, document.body)}
      {showConnectModal && <WalletConnectModal onDismiss={() => setShowConnectModal(false)} />}
    </>
  );
};

export default MobileMenu;
