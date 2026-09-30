import classes from './Banner.module.css';
import Section from '../../layout/Section';
import calendar_alp from '../../assets/alps_dao_homepage.png';
import Image from 'react-bootstrap/Image';
import { Trans } from '@lingui/macro';
import { auctionsPerDay, useAuctionSettings } from '../../wrappers/alpsAuction';

const Banner = () => {
  const perDay = auctionsPerDay(useAuctionSettings().duration);
  return (
    <Section fullWidth={false} className={classes.bannerSection}>
      <div className={classes.wrapper}>
        <h1 style={{ textAlign: 'center' }}>
          <Trans>ONE ALP AT A TIME,</Trans>
          <br />
          <Trans>UP TO {perDay} A DAY,</Trans>
          <br />
          <Trans>FOREVER.</Trans>
        </h1>
      </div>
      <div style={{ padding: '2rem', paddingBottom: '1rem' }}>
        <Image src={calendar_alp} alt={'Banner Image'} fluid />
      </div>
    </Section>
  );
};

export default Banner;
