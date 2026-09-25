import Section from '../../layout/Section';
import { Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import classes from './Documentation.module.css';
import { Trans } from '@lingui/macro';

// A short summary on the home page; the full story lives on /about
const Documentation = () => {
  return (
    <Section fullWidth={false}>
      <Col lg={{ span: 10, offset: 1 }}>
        <div className={classes.headerWrapper}>
          <h1>
            <Trans>WTF?</Trans>
          </h1>
          <p className={classes.aboutText}>
            <Trans>
              We take ⌐◨-◨ deep into the pristine pow of the world. Alps is an alpine club for skiers,
              snowboarders and mountain lovers of every kind, with a treasury its members run together.
              If that’s you, join us by bidding above.
            </Trans>
          </p>
        </div>
        <ul className={classes.summary}>
          <li>
            <Trans>
              One Alp is auctioned every 3 hours, forever. Each Alp is a membership in the club and one
              vote.
            </Trans>
          </li>
          <li>
            <Trans>
              100% of auction proceeds go to the club treasury, which members spend by proposing and
              voting.
            </Trans>
          </li>
          <li>
            <Trans>
              Anyone can kick off the next auction once one ends. Alps that get no bids go to the
              Warming Hut.
            </Trans>
          </li>
          <li>
            <Trans>
              Until Alp #14,600, every 10th Alp goes to the founders and every other 5th Alp to the
              Alpine Council.
            </Trans>
          </li>
          <li>
            <Trans>
              Alp art is 32×32 pixels, generated from 7 backgrounds, 32 bodies, 182 accessories, 248
              heads and 200 glasses, stored entirely on-chain and in the public domain.
            </Trans>
          </li>
        </ul>
        <p className={classes.links}>
          <Link to="/about">
            <Trans>Read more about Alps</Trans> →
          </Link>
          <Link to="/playground">
            <Trans>Make your own Alps in the Playground</Trans> →
          </Link>
        </p>
      </Col>
    </Section>
  );
};

export default Documentation;
