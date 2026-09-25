import { Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Section from '../../layout/Section';
import { useAllProposals, useProposalThreshold } from '../../wrappers/alpsDao';
import Proposals from '../../components/Proposals';
import classes from './Governance.module.css';
import { utils } from 'ethers/lib/ethers';
import clsx from 'clsx';
import { useTreasuryBalance, useTreasuryUSDValue } from '../../hooks/useTreasuryBalance';
import { Trans } from '@lingui/macro';
import { i18n } from '@lingui/core';

const GovernancePage = () => {
  const { data: proposals } = useAllProposals();
  const threshold = useProposalThreshold();
  const alpsRequired = threshold !== undefined ? threshold + 1 : '...';

  const treasuryBalance = useTreasuryBalance();
  const treasuryBalanceUSD = useTreasuryUSDValue(treasuryBalance);

  // Note: We have to extract this copy out of the <span> otherwise the Lingui macro gets confused
  const alpSingular = <Trans>Alp</Trans>;
  const alpPlural = <Trans>Alps</Trans>;

  return (
    <Section fullWidth={false} className={classes.section}>
      <Col lg={10} className={classes.wrapper}>
        <Row className={classes.headerRow}>
          <span>
            <Trans>Governance</Trans>
          </span>
          <h1>
            <Trans>Alps</Trans>
          </h1>
        </Row>
        <p className={classes.subheading}>
          <Trans>
            Each Alp is a membership in the club and one vote. Members vote on proposals to spend
            the treasury, or delegate their votes to someone else. Submitting a proposal takes at
            least{' '}
            <span className={classes.boldText}>
              {alpsRequired} {threshold === 0 ? alpSingular : alpPlural}
            </span>
            . <Link to="/about#governance">How governance works</Link>
          </Trans>
        </p>

        <Row className={classes.treasuryInfoCard}>
          <Col lg={8} className={classes.treasuryAmtWrapper}>
            <Row className={classes.headerRow}>
              <span>
                <Trans>Treasury</Trans>
              </span>
            </Row>
            <Row>
              <Col className={clsx(classes.ethTreasuryAmt)} lg={3}>
                <h1 className={classes.ethSymbol}>Ξ</h1>
                <h1>
                  {treasuryBalance &&
                    i18n.number(Number(Number(utils.formatEther(treasuryBalance)).toFixed(3)))}
                </h1>
              </Col>
              <Col className={classes.usdTreasuryAmt}>
                <h1 className={classes.usdBalance}>
                  {treasuryBalanceUSD &&
                    i18n.number(Number(Number(utils.formatEther(treasuryBalanceUSD)).toFixed(2)), {
                      style: 'currency',
                      currency: 'USD',
                    })}
                </h1>
              </Col>
            </Row>
          </Col>
          <Col className={classes.treasuryInfoText}>
            <Trans>
              The club treasury holds 100% of auction proceeds, and is only spent when members vote
              for it.
            </Trans>
          </Col>
        </Row>
        <Proposals proposals={proposals} />
      </Col>
    </Section>
  );
};
export default GovernancePage;
