import React, { RefObject, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  // The header, which a phone's menu opens below, and the button, which a wider screen's menu hangs from
  headerRef: RefObject<HTMLElement>;
  buttonRef: RefObject<HTMLButtonElement>;
  // ETH, formatted
  treasuryBalance?: string;
}

// From this wide the menu is a dropdown under its button; narrower, it fills the screen below the header
const DROPDOWN_QUERY = '(min-width: 768px)';
// Widths where the header or the menu change shape, so an open menu closes rather than sit in the wrong place
const LAYOUT_QUERIES = ['(max-width: 568px)', DROPDOWN_QUERY, '(min-width: 1200px)'];

interface Layout {
  dropdown: boolean;
  style: React.CSSProperties;
}

/**
 * The menu below 1200px wide, where the header has no room for its links: the pages as a list, the current
 * one marked, and the wallet at the bottom. On phones it covers the page under the header; on wider screens
 * it's a dropdown. It closes on a link, a click outside it, Escape, or the page changing.
 */
const MobileMenu: React.FC<MobileMenuProps> = ({
  open,
  onClose,
  headerRef,
  buttonRef,
  treasuryBalance,
}) => {
  const { pathname } = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>();
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

  // Placed before it's drawn: under the header on phones, under the button (and scrolling with the page)
  // on wider screens
  useLayoutEffect(() => {
    if (!open) {
      setLayout(undefined);
      return;
    }
    const header = headerRef.current?.getBoundingClientRect();
    const button = buttonRef.current?.getBoundingClientRect();
    if (button && window.matchMedia(DROPDOWN_QUERY).matches) {
      setLayout({
        dropdown: true,
        style: {
          top: button.bottom + window.scrollY + 8,
          right: document.documentElement.clientWidth - button.right,
        },
      });
    } else {
      setLayout({ dropdown: false, style: { top: Math.max(0, header?.bottom ?? 0) } });
    }
  }, [open, headerRef, buttonRef]);

  useEffect(() => {
    if (!open || !layout) return;
    // Keyboard users carry on into the menu from here
    menuRef.current?.focus({ preventScroll: true });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onClose();
      buttonRef.current?.focus();
    };
    // The menu button toggles the menu itself
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) onClose();
    };
    const queries = LAYOUT_QUERIES.map(query => window.matchMedia(query));
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    queries.forEach(query => query.addEventListener?.('change', onClose));
    // Phones: the page behind stays put. A dropdown leaves the page free to scroll.
    const { overflow } = document.body.style;
    if (!layout.dropdown) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      queries.forEach(query => query.removeEventListener?.('change', onClose));
    };
  }, [open, layout, onClose, buttonRef]);

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

  const menu = open && layout && (
    <div
      id="mobile-menu"
      ref={menuRef}
      tabIndex={-1}
      className={clsx(classes.menu, layout.dropdown && classes.dropdown)}
      style={layout.style}
    >
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
