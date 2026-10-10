import { useAppSelector } from '../../hooks';
import classes from './NavBar.module.css';
import logo from '../../assets/logo.svg';
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';
import { Nav, Navbar, Container } from 'react-bootstrap';
import testnetAlp from '../../assets/testnet-alp.png';
import { CHAIN_ID } from '../../config';
import { utils } from 'ethers';
import NavBarButton, { NavBarButtonStyle } from '../NavBarButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';
import { faUsers } from '@fortawesome/free-solid-svg-icons';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import { faGavel } from '@fortawesome/free-solid-svg-icons';
import NavBarTreasury from '../NavBarTreasury';
import NavWallet from '../NavWallet';
import { Trans } from '@lingui/macro';
import clsx from 'clsx';
import React, { useCallback, useRef, useState } from 'react';
import { useTreasuryBalance } from '../../hooks/useTreasuryBalance';
import MobileMenu from './MobileMenu';

const NavBar = () => {
  const activeAccount = useAppSelector(state => state.account.activeAccount);
  // const stateBgColor = useAppSelector(state => state.application.stateBackgroundColor);
  const isCool = useAppSelector(state => state.application.isCoolBackground);
  const history = useHistory();
  const treasuryBalance = useTreasuryBalance();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const isMobile = window.innerWidth < 992;
  const treasuryETH = treasuryBalance && Number(utils.formatEther(treasuryBalance)).toFixed(3);

  const useStateBg =
    history.location.pathname === '/' ||
    history.location.pathname.includes('/alp/') ||
    history.location.pathname.includes('/auction/');

  const nonWalletButtonStyle = !useStateBg
    ? NavBarButtonStyle.WHITE_INFO
    : isCool
    ? NavBarButtonStyle.COOL_INFO
    : NavBarButtonStyle.WARM_INFO;

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const toggleMenu = () => {
    if (!isMenuOpen) setMenuTop(Math.max(0, navRef.current?.getBoundingClientRect().bottom ?? 0));
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <Navbar
        ref={navRef}
        expand="xl"
        style={{ backgroundColor: `#213343` }}
        className={classes.navBarCustom}
      >
        <Container style={{ maxWidth: 'unset', paddingBottom: isMobile ? 3 : 0 }}>
          <div className={classes.brandAndTreasuryWrapper}>
            <Navbar.Brand as={Link} to="/" className={classes.navBarBrand}>
              <img src={logo} className={classes.navBarLogo} alt="Alps logo" />
            </Navbar.Brand>
            {Number(CHAIN_ID) !== 1 && (
              <Nav.Item>
                <img className={classes.testnetImg} src={testnetAlp} alt="testnet alp" />
                TESTNET
              </Nav.Item>
            )}
            <Nav.Item>
              {treasuryETH && (
                <Nav.Link as={Link} to="/treasury" className={classes.alpsNavLink}>
                  <NavBarTreasury treasuryBalance={treasuryETH} treasuryStyle={nonWalletButtonStyle} />
                </Nav.Link>
              )}
            </Nav.Item>
          </div>
          {/* Phones and tablets: the menu instead of the links */}
          <button
            type="button"
            className={clsx(classes.menuButton, 'd-xl-none')}
            aria-controls="mobile-menu"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={toggleMenu}
          >
            <span className={clsx(classes.menuIcon, isMenuOpen && classes.menuIconOpen)} />
          </button>
          <MobileMenu
            open={isMenuOpen}
            onClose={closeMenu}
            top={menuTop}
            treasuryBalance={treasuryETH || undefined}
          />
          <Navbar.Collapse className="justify-content-end">
            <Nav.Link as={Link} to="/" className={classes.alpsNavLink}>
              <NavBarButton
                buttonText={<Trans>Auction</Trans>}
                buttonIcon={<FontAwesomeIcon icon={faGavel} />}
                buttonStyle={nonWalletButtonStyle}
              />
            </Nav.Link>
            <Nav.Link as={Link} to="/vote" className={classes.alpsNavLink}>
              <NavBarButton
                buttonText={<Trans>Governance</Trans>}
                buttonIcon={<FontAwesomeIcon icon={faUsers} />}
                buttonStyle={nonWalletButtonStyle}
              />
            </Nav.Link>
            <Nav.Link as={Link} to="/about" className={classes.alpsNavLink}>
              <NavBarButton
                buttonText={<Trans>About</Trans>}
                buttonIcon={<FontAwesomeIcon icon={faBookOpen} />}
                buttonStyle={nonWalletButtonStyle}
              />
            </Nav.Link>
            {/* <Nav.Link
              href={externalURL(ExternalURL.discourse)}
              className={classes.alpsNavLink}
              target="_blank"
              rel="noreferrer"
            >
              <NavBarButton
                buttonText={<Trans>Discourse</Trans>}
                buttonIcon={<FontAwesomeIcon icon={faComments} />}
                buttonStyle={nonWalletButtonStyle}
              />
            </Nav.Link> */}
            <Nav.Link as={Link} to="/playground" className={classes.alpsNavLink}>
              <NavBarButton
                buttonText={<Trans>Playground</Trans>}
                buttonIcon={<FontAwesomeIcon icon={faPlay} />}
                buttonStyle={nonWalletButtonStyle}
              />
            </Nav.Link>
            {/* <NavLocaleSwitcher buttonStyle={nonWalletButtonStyle} /> */}
            <NavWallet address={activeAccount || '0'} />
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
};

export default NavBar;
