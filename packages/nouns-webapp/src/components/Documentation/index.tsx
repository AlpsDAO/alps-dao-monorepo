import Section from '../../layout/Section';
import { Col } from 'react-bootstrap';
import classes from './Documentation.module.css';
import Accordion from 'react-bootstrap/Accordion';
import Link from '../Link';
import { Trans } from '@lingui/macro';

// Define reusable Link components outside of Trans for efficiency and clarity
const PlaygroundLink = () => (
  <Link text={<Trans>Playground</Trans>} url="/playground" leavesPage={false} />
);

const PublicDomainLink = () => (
  <Link
    text={<Trans>public domain</Trans>}
    url="https://creativecommons.org/publicdomain/zero/1.0/"
    leavesPage={true}
  />
);

const CompoundGovLink = () => (
  <Link
    text={<Trans>Compound Governance</Trans>}
    url="https://compound.finance/governance"
    leavesPage={true}
  />
);

const NounsDAOLink = () => (
  <Link
    text={<Trans>Nouns DAO</Trans>}
    url="https://nouns.wtf/"
    leavesPage={true}
  />
);

const Documentation = () => {
  return (
    <Section fullWidth={false}>
      <Col lg={{ span: 10, offset: 1 }}>
        <div className={classes.headerWrapper}>
          <h1><Trans>WTF?</Trans></h1>
          <p className={classes.aboutText}>
            <Trans>
              Alps is an extension of <NounsDAOLink /> and Gnars, focused on establishing
              long-term relationships with alpine resorts to proliferate Alps, provide
              unique membership perks to members, and support proposals that enhance
              on-mountain environments and experiences.
            </Trans>
          </p>
          <p className={classes.aboutText} style={{ paddingBottom: '4rem' }}>
            <Trans>
              Learn more about Alps below or create your own Alps off-chain using our <PlaygroundLink />.
            </Trans>
          </p>
        </div>

        <Accordion flush>
          <Accordion.Item eventKey="0" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              <Trans>Summary</Trans>
            </Accordion.Header>
            <Accordion.Body>
              <ul>
                <li>
                  <Trans>Alps token artwork is in the <PublicDomainLink />.</Trans>
                </li>
                <li>
                  <Trans>One Alp is trustlessly auctioned every 3 hours, forever.</Trans>
                </li>
                <li>
                  <Trans>100% of Alp auction proceeds are trustlessly sent to the treasury.</Trans>
                </li>
                <li>
                  <Trans>Settlement of one auction kicks off the next.</Trans>
                </li>
                <li>
                  <Trans>All Alp tokens are members of Alps DAO.</Trans>
                </li>
                <li>
                  <Trans>Alps uses a fork of <CompoundGovLink />.</Trans>
                </li>
                <li><Trans>One Alp is equal to one vote.</Trans></li>
                <li><Trans>The treasury is controlled exclusively by Alps via governance.</Trans></li>
                <li><Trans>Artwork is generative and stored directly onchain (not IPFS).</Trans></li>
                <li>
                  <Trans>
                    No explicit rules exist for attribute scarcity; all Alps are equally rare but
                    trait occurrence can vary, creating dynamics around rarity.
                  </Trans>
                </li>
                <li>
                  <Trans>Founders receive rewards in the form of Alps (10% of supply for first 5 years).</Trans>
                </li>
                <li>
                  <Trans>
                    The Alpine Council receives rewards in the form of Alps (10% of supply for first 5 years).
                  </Trans>
                </li>
                <li>
                  <Trans>
                    Alps that receive no bids are sent to the Warming Hut (warminghut.eth), a wallet
                    for rescue opportunities and burn events.
                  </Trans>
                </li>
              </ul>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              <Trans>Auctions</Trans>
            </Accordion.Header>
            <Accordion.Body>
              <p className={classes.aboutText}>
                <Trans>
                  The Alps Auction Contract will act as a self-sufficient Alp generation and
                  distribution mechanism, auctioning one Alp every 3 hours, forever. 100% of auction
                  proceeds (ETH) are automatically deposited in the Alps DAO treasury.
                </Trans>
              </p>

              <p className={classes.aboutText}>
                <Trans>
                  Each auction settlement triggers a new Alp mint and begins a new 3-hour auction.
                </Trans>
              </p>
              <p>
                <Trans>
                  While the winning bidder is incentivised to settle the auction, anyone can trigger
                  settlement, ensuring continuous auctions as long as Ethereum is operational.
                </Trans>
              </p>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="2" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              <Trans>Alps DAO</Trans>
            </Accordion.Header>
            <Accordion.Body>
              <Trans>
                Alps utilises <NounsDAOLink />'s fork of <CompoundGovLink /> and governs the Alps ecosystem.
                Each Alp represents one vote in governance matters, with votes delegatable but
                non-transferable.
              </Trans>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              <Trans>Governance ‘Slow Start’</Trans>
            </Accordion.Header>
            <Accordion.Body>
              <p>
                <Trans>
                  Founders hold a temporary veto right to block malicious proposals during initial
                  distribution. This right will be revoked once the community is sufficiently engaged.
                </Trans>
              </p>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="4" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              <Trans>Alp Traits</Trans>
            </Accordion.Header>
            <Accordion.Body>
              <p>
                <Trans>
                  Alps are generated pseudo-randomly, with no rules governing trait scarcity. Current
                  traits include:
                </Trans>
              </p>
              <ul>
                <li><Trans>Backgrounds (7)</Trans></li>
                <li><Trans>Bodies (32)</Trans></li>
                <li><Trans>Accessories (182)</Trans></li>
                <li><Trans>Heads (248)</Trans></li>
                <li><Trans>Glasses (200)</Trans></li>
              </ul>
              <Trans>Experiment with Alp generation using the <PlaygroundLink />.</Trans>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Col>
    </Section>
  );
};

export default Documentation;
