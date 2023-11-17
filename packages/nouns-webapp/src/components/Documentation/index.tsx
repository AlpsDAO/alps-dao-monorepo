import Section from '../../layout/Section';
import { Col } from 'react-bootstrap';
import classes from './Documentation.module.css';
import Accordion from 'react-bootstrap/Accordion';
import Link from '../Link';
import { Trans } from '@lingui/macro';

const Documentation = () => {
  const playgroundLink = (
    <Link text={<Trans>Playground</Trans>} url="/playground" leavesPage={false} />
  );
  const publicDomainLink = (
    <Link
      text={<Trans>public domain</Trans>}
      url="https://creativecommons.org/publicdomain/zero/1.0/"
      leavesPage={true}
    />
  );
  const compoundGovLink = (
    <Link
      text={<Trans>Compound Governance</Trans>}
      url="https://compound.finance/governance"
      leavesPage={true}
    />
  );
  const nounsDAOLink = (
    <Link text={<Trans>Nouns DAO</Trans>} url="https://nouns.wtf/" leavesPage={true} />
  );
  return (
    <Section fullWidth={false}>
      <Col lg={{ span: 10, offset: 1 }}>
        <div className={classes.headerWrapper}>
          <h1>
            <Trans>WTF?</Trans>
          </h1>
          <p className={classes.aboutText}>
            <Trans>
              Alps is an extension of {nounsDAOLink} and Gnars, focused on establishing long term
              relationships with alpine resorts to proliferate Alps, provide unique membership perks
              to members and support proposals that enhance on-mountain environments and
              experiences.
            </Trans>
          </p>
          <p className={classes.aboutText} style={{ paddingBottom: '4rem' }}>
            <Trans>
              Learn more about Alps below or create your own Alps off-chain using our{' '}
              {playgroundLink}.
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
                  <Trans>Alps token artwork is in the {publicDomainLink}.</Trans>
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
                  <Trans>Alps uses a fork of {compoundGovLink}.</Trans>
                </li>
                <li>
                  <Trans>One Alp is equal to one vote.</Trans>
                </li>
                <li>
                  <Trans>The treasury is controlled exclusively by Alps via governance.</Trans>
                </li>
                <li>
                  <Trans>Artwork is generative and stored directly onchain (not IPFS).</Trans>
                </li>
                <li>
                  <Trans>
                    No explicit rules exist for attribute scarcity; all Alps are equally rare but
                    trait occurrence can vary which does create some dynamics around rarity.
                  </Trans>
                </li>
                <li>
                  <Trans>
                    Founders receive rewards in the form of Alps (10% of supply for first 5 years).
                  </Trans>
                </li>
                <li>
                  <Trans>
                    The Alpine Council receives rewards in the form of Alps (10% of supply for first
                    5 years).
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
                  proceeds (ETH) are automatically deposited in the Alps DAO treasury, where they
                  are governed by Alp owners.
                </Trans>
              </p>

              <p className={classes.aboutText}>
                <Trans>
                  Each time an auction is settled, the settlement transaction will also cause a new
                  Alp to be minted and a new 3 hour auction to begin.
                </Trans>
              </p>
              <p>
                <Trans>
                  While settlement is most heavily incentivized for the winning bidder, it can be
                  triggered by anyone, allowing the system to trustlessly auction Alps as long as
                  Ethereum is operational and there are interested bidders.
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
                Alps utilizes {nounsDAOLink}’s fork of {compoundGovLink} and is the main
                governing body of the Alps ecosystem. The Alps treasury receives 100% of ETH
                proceeds from Alp auctions. Each Alp is an irrevocable member of Alps DAO and
                entitled to one vote in all governance matters. Alp votes are non-transferable (if
                you sell your Alp the vote goes with it) but delegatable, which means you can assign
                your vote to someone else as long as you own your Alp.
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
                  In addition to the precautions taken by Compound Governance, the founders have
                  given themselves a special veto right to ensure that no malicious proposals can be
                  passed while the Alp supply is low. This veto right will only be used if an
                  obviously harmful governance proposal has been passed, and is intended as a last
                  resort.
                </Trans>
              </p>
              <p>
                <Trans>
                  The founders will provably revoke this veto right when they deem it safe to do so.
                  This decision will be based on a healthy Alp distribution and a community that is
                  engaged in the governance process.
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
                  Alps are generated pseudo-randomly based on Ethereum block hashes. There are no
                  'if' statements or other rules governing Alp trait scarcity, which makes all Alps
                  equally rare. As of this writing, Alps are made up of:
                </Trans>
              </p>
              <ul>
                <li>
                  <Trans>backgrounds (7) </Trans>
                </li>
                <li>
                  <Trans>bodies (32)</Trans>
                </li>
                <li>
                  <Trans>accessories (182) </Trans>
                </li>
                <li>
                  <Trans>heads (248) </Trans>
                </li>
                <li>
                  <Trans>glasses (200)</Trans>
                </li>
              </ul>
              <Trans>
                You can experiment with off-chain Alp generation at the {playgroundLink}.
              </Trans>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="5" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              <Trans>On-Chain Artwork</Trans>
            </Accordion.Header>
            <Accordion.Body>
              <p>
                <Trans>
                  Alps are stored directly on Ethereum and do not utilize pointers to other networks
                  such as IPFS. This is possible because Alp parts are compressed and stored
                  on-chain using a custom run-length encoding (RLE), which is a form of lossless
                  compression.
                </Trans>
              </p>

              <p>
                <Trans>
                  The compressed parts are efficiently converted into a single base64 encoded SVG
                  image on-chain. To accomplish this, each part is decoded into an intermediate
                  format before being converted into a series of SVG rects using batched, on-chain
                  string concatenation. Once the entire SVG has been generated, it is base64
                  encoded.
                </Trans>
              </p>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="6" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              <Trans>Alp Seeder Contract</Trans>
            </Accordion.Header>
            <Accordion.Body>
              <p>
                <Trans>
                  The Alp Seeder contract is used to determine Alp traits during the minting
                  process. The seeder contract can be replaced to allow for future trait generation
                  algorithm upgrades. Additionally, it can be locked by the Alps DAO to prevent any
                  future updates. Currently, Alp traits are determined using pseudo-random number
                  generation:
                </Trans>
              </p>
              <code>keccak256(abi.encodePacked(blockhash(block.number - 1), alpId))</code>
              <br />
              <br />
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="7" className={classes.accordionItem}>
            <Accordion.Header className={classes.accordionHeader}>
              <Trans>Founders & Alpine Council Rewards</Trans>
            </Accordion.Header>
            <Accordion.Body>
              <p>
                <Trans>
                  Because 100% of Alp auction proceeds are sent to the Alps treasury, the founders have
                  chosen to compensate themselves with Alp tokens. Every 10th Alp for the first 5 years of
                  the project (Alp IDs #0, #10, #20, #30 and so on) will be automatically sent to a
                  multisig to be vested and shared among the founding members of the project.
                </Trans>
              </p>
              <p>
                <Trans>
                  Additionally, the founders have chosen to establish The Alpine Council which is a
                  group that consists of the founders plus early team members and contributors, and
                  compensate this group with Alps. Every 10th Alp with ID ending in "5" for the first 5 years of the
                  project (Alp IDs #5, #15, #25, #35 and so on) will be automatically sent to
                  The Alpine Council multisig to be utilized by active Alpine Council members in voting.
                </Trans>
              </p>
              <p>
                <Trans>
                  These distributions don't interfere with the cadence of 3 hour auctions. Alps are
                  sent directly to the founder multisig and the Alpine Council multisig and auctions
                  continue on schedule with the next available Alp ID.
                </Trans>
              </p>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Col>
    </Section>
  );
};
export default Documentation;
