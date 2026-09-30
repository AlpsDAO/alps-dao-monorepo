import React from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { constants } from 'ethers';
import { Trans } from '@lingui/macro';
import { Auction } from '../../wrappers/alpsAuction';
import { nextRewardAlp } from '../../utils/alperAlp';
import ShortAddress from '../ShortAddress';
import NextAlpPreview from '../NextAlpPreview';
import { useNextAlpPreview } from '../../hooks/useNextAlpPreview';
import { formatAuctionLengthAdjective, useAuctionSettings } from '../../wrappers/alpsAuction';
import classes from './KickOffAuction.module.css';

/**
 * Shown once an auction has ended and nobody has settled it yet. Settling sends the ended auction's
 * Alp on its way and mints the next one, so this is what restarts auctions after a quiet spell.
 */
const KickOffAuction: React.FC<{
  auction: Auction;
  pending: boolean;
  onKickOff: () => void;
}> = ({ auction, pending, onKickOff }) => {
  const alpId = auction.alpId.toNumber();
  const hasWinner = auction.bidder !== constants.AddressZero && !auction.amount.isZero();
  const reward = nextRewardAlp(auction.alpId);
  const nextAuctionAlpId = (reward ? reward.alpId.add(1) : auction.alpId.add(1)).toNumber();
  const preview = useNextAlpPreview();
  const settings = useAuctionSettings();
  const length = formatAuctionLengthAdjective(settings.duration);

  // Paused by the DAO: the ended auction can still be settled, but no new Alp is minted until a
  // proposal resumes auctions
  if (settings.paused) {
    return (
      <div className={classes.kickOff}>
        <Button className={classes.kickOffBtn} onClick={onKickOff} disabled={pending}>
          {pending ? <Spinner animation="border" size="sm" /> : <Trans>Settle Alp {alpId}</Trans>}
        </Button>
        <p className={classes.explainer}>
          <Trans>
            Auctions are paused by the DAO, so no new auction starts until a proposal resumes them. Anyone
            can still settle Alp {alpId}, which sends it to{' '}
            {hasWinner ? <ShortAddress address={auction.bidder} /> : <Trans>the Warming Hut</Trans>}.
          </Trans>
        </p>
      </div>
    );
  }

  return (
    <div className={classes.kickOff}>
      {preview && <NextAlpPreview preview={preview} />}
      <Button className={classes.kickOffBtn} onClick={onKickOff} disabled={pending}>
        {pending ? <Spinner animation="border" size="sm" /> : <Trans>Kick off the next auction</Trans>}
      </Button>
      <p className={classes.explainer}>
        {hasWinner ? (
          <Trans>
            This sends Alp {alpId} to its winner, <ShortAddress address={auction.bidder} />, and mints
            Alp {nextAuctionAlpId} for a new {length} auction.
          </Trans>
        ) : (
          <Trans>
            Nobody bid on Alp {alpId}, so this sends it to the Warming Hut and mints Alp{' '}
            {nextAuctionAlpId} for a new {length} auction.
          </Trans>
        )}{' '}
        {reward?.recipient === 'founders' && (
          <Trans>It also mints Alp {reward.alpId.toNumber()} for the founders.</Trans>
        )}
        {reward?.recipient === 'council' && (
          <Trans>It also mints Alp {reward.alpId.toNumber()} for the Alpine Council.</Trans>
        )}{' '}
        <Trans>
          Next up is the Alp it would mint right now: its traits come from the latest block, so it
          changes with every new block, about every 12 seconds. Anyone can kick off the next auction;
          it only costs gas.
        </Trans>
      </p>
    </div>
  );
};

export default KickOffAuction;
