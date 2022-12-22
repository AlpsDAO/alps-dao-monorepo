import { useAppSelector } from '../../hooks';
import classes from './NavBar.module.css';
import logo from '../../assets/logo.svg';
import { useEtherBalance } from '@usedapp/core';
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';
import { Nav, Navbar, Container } from 'react-bootstrap';
import testnetAlp from '../../assets/testnet-alp.png';
import config, { CHAIN_ID } from '../../config';
import { utils } from 'ethers';
import { buildEtherscanHoldingsLink } from '../../utils/etherscan';
import { ExternalURL, externalURL } from '../../utils/externalURL';
import useLidoBalance from '../../hooks/useLidoBalance';
import NavBarButton, { NavBarButtonStyle } from '../NavBarButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';
import { faUsers } from '@fortawesome/free-solid-svg-icons';
import { faComments } from '@fortawesome/free-solid-svg-icons';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import NavBarTreasury from '../NavBarTreasury';
import NavWallet from '../NavWallet';
import { Trans } from '@lingui/macro';
import React, { useState } from 'react';
import NavLocaleSwitcher from '../NavLocaleSwitcher';

const NavBar = () => {
  const activeAccount = useAppSelector(state => state.account.activeAccount);
  // const stateBgColor = useAppSelector(state => state.application.stateBackgroundColor);
  const isCool = useAppSelector(state => state.application.isCoolBackground);
  const history = useHistory();
  const ethBalance = useEtherBalance(config.addresses.alpsDaoExecutor);
  const lidoBalanceAsETH = useLidoBalance();
  const treasuryBalance = ethBalance && lidoBalanceAsETH && ethBalance.add(lidoBalanceAsETH);
  const daoEtherscanLink = buildEtherscanHoldingsLink(config.addresses.alpsDaoExecutor);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const isMobile = window.innerWidth < 992;

  const useStateBg =
    history.location.pathname === '/' ||
    history.location.pathname.includes('/alp/') ||
    history.location.pathname.includes('/auction/');

  const nonWalletButtonStyle = !useStateBg
    ? NavBarButtonStyle.WHITE_INFO
    : isCool
    ? NavBarButtonStyle.COOL_INFO
    : NavBarButtonStyle.WARM_INFO;

  const closeNav = () => setIsNavExpanded(false);

  return (
    <>
      <Navbar
        expand="xl"
        style={{ backgroundColor: `#213343` }}
        className={classes.navBarCustom}
        expanded={isNavExpanded}
      >
        <Container style={{ maxWidth: 'unset', paddingBottom: isMobile ? 3 : 0 }}>
          <div className={classes.brandAndTreasuryWrapper}>
            <Navbar.Brand as={Link} to="/" className={classes.navBarBrand}>
              <img src={logo} className={classes.navBarLogo} alt="Alps DAO logo" />
            </Navbar.Brand>
            {Number(CHAIN_ID) !== 1 && (
              <Nav.Item>
                <img className={classes.testnetImg} src={testnetAlp} alt="testnet alp" />
                TESTNET
              </Nav.Item>
            )}
            <Nav.Item>
              {treasuryBalance && (
                <Nav.Link
                  href={daoEtherscanLink}
                  className={classes.alpsNavLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <NavBarTreasury
                    treasuryBalance={Number(utils.formatEther(treasuryBalance)).toFixed(3)}
                    treasuryStyle={nonWalletButtonStyle}
                  />
                </Nav.Link>
              )}
            </Nav.Item>
          </div>
          <Navbar.Toggle
            className={classes.navBarToggle}
            aria-controls="basic-navbar-nav"
            onClick={() => setIsNavExpanded(!isNavExpanded)}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 30 30"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M3 7C3 6.44772 3.44772 6 4 6H26C26.5523 6 27 6.44772 27 7C27 7.55228 26.5523 8 26 8H4C3.44772 8 3 7.55228 3 7ZM3 15C3 14.4477 3.44772 14 4 14H26C26.5523 14 27 14.4477 27 15C27 15.5523 26.5523 16 26 16H4C3.44772 16 3 15.5523 3 15ZM3 23C3 22.4477 3.44772 22 4 22H26C26.5523 22 27 22.4477 27 23C27 23.5523 26.5523 24 26 24H4C3.44772 24 3 23.5523 3 23Z"
                fill="white"
              />
            </svg>
          </Navbar.Toggle>
          <Navbar.Collapse className="justify-content-end">
            <Nav.Link as={Link} to="/vote" className={classes.alpsNavLink} onClick={closeNav}>
              <NavBarButton
                buttonText={<Trans>DAO</Trans>}
                buttonIcon={<FontAwesomeIcon icon={faUsers} />}
                buttonStyle={nonWalletButtonStyle}
              />
            </Nav.Link>
            <Nav.Link
              href={'https://alpsdao.gitbook.io/about/'}
              className={classes.alpsNavLink}
              target="_blank"
              rel="noreferrer"
              onClick={closeNav}
            >
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
              onClick={closeNav}
            >
              <NavBarButton
                buttonText={<Trans>Discourse</Trans>}
                buttonIcon={<FontAwesomeIcon icon={faComments} />}
                buttonStyle={nonWalletButtonStyle}
              />
            </Nav.Link> */}
            <Nav.Link as={Link} to="/playground" className={classes.alpsNavLink} onClick={closeNav}>
              <NavBarButton
                buttonText={<Trans>Playground</Trans>}
                buttonIcon={<FontAwesomeIcon icon={faPlay} />}
                buttonStyle={nonWalletButtonStyle}
              />
            </Nav.Link>
            {/* <NavLocaleSwitcher buttonStyle={nonWalletButtonStyle} /> */}
            <NavWallet address={activeAccount || '0'} buttonStyle={nonWalletButtonStyle} />{' '}
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
};

export default NavBar;
