import classes from './Banner.module.css';
import Section from '../../layout/Section';
import calendar_noun from '../../assets/alps_dao_homepage.png';
import Image from 'react-bootstrap/Image';
import { Trans } from '@lingui/macro';

const Banner = () => {
  return (
    <Section fullWidth={false} className={classes.bannerSection}>
      <div className={classes.wrapper}>
        <h1 style={{ textAlign: 'center' }}>
          <Trans>ONE ALP,</Trans>
          <br />
          <Trans>EVERY 3 HOURS,</Trans>
          <br />
          <Trans>FOREVER.</Trans>
        </h1>
      </div>
      <div style={{ padding: '2rem', paddingBottom: '1rem' }}>
        <Image src={calendar_noun} alt={'Banner Image'} fluid />
      </div>
    </Section>
  );
};

export default Banner;
