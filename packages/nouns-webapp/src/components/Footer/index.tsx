import classes from './Footer.module.css';
import { Container } from 'react-bootstrap';
import { buildEtherscanAddressLink } from '../../utils/etherscan';
import { externalURL, ExternalURL } from '../../utils/externalURL';
import config from '../../config';
import Link from '../Link';
import { Trans } from '@lingui/macro';

const Footer = () => {
  const discordURL = externalURL(ExternalURL.discord);
  const twitterURL = externalURL(ExternalURL.twitter);
  const warpcastURL = externalURL(ExternalURL.warpcast);
  const alpsCenterURL = externalURL(ExternalURL.alpsCenter);
  const etherscanURL = buildEtherscanAddressLink(config.addresses.alpsToken);

  return (
    <div className={classes.wrapper}>
      <Container className={classes.container}>
        <footer className={classes.footerSignature}>
          <Link text={<Trans>Alps Center</Trans>} url={alpsCenterURL} leavesPage={true} />
          <Link text={<Trans>Discord</Trans>} url={discordURL} leavesPage={true} />
          <Link text={<Trans>Warpcast</Trans>} url={warpcastURL} leavesPage={true} />
          <Link text={<Trans>Twitter</Trans>} url={twitterURL} leavesPage={true} />
          <Link text={<Trans>Etherscan</Trans>} url={etherscanURL} leavesPage={true} />
        </footer>
      </Container>
    </div>
  );
};
export default Footer;
