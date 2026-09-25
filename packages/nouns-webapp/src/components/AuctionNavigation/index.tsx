import React, { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThLarge } from '@fortawesome/free-solid-svg-icons';
import { Trans } from '@lingui/macro';
import classes from './AuctionNavigation.module.css';
import AlpBrowser from '../AlpBrowser';
import { useAppSelector } from '../../hooks';
import { useHistory } from 'react-router';
import useOnDisplayAuction from '../../wrappers/onDisplayAuction';

const AuctionNavigation: React.FC<{
  isFirstAuction: boolean;
  isLastAuction: boolean;
  onPrevAuctionClick: () => void;
  onNextAuctionClick: () => void;
}> = props => {
  const { isFirstAuction, isLastAuction, onPrevAuctionClick, onNextAuctionClick } = props;
  const isCool = useAppSelector(state => state.application.stateBackgroundColor) === '#d5d7e1';
  const history = useHistory();
  const onDisplayAuction = useOnDisplayAuction();
  const lastAuctionAlpId = useAppSelector(state => state.onDisplayAuction.lastAuctionAlpId);
  const onDisplayAuctionAlpId = onDisplayAuction?.alpId.toNumber();
  const [browsing, setBrowsing] = useState(false);
  const closeBrowser = useCallback(() => setBrowsing(false), []);

  // Page through Alps via keyboard
  // handle what happens on key press
  const handleKeyPress = useCallback(
    event => {
      // Arrow keys belong to whatever's being typed in (a bid, the browser's search)
      if (browsing || (event.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]')) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        // This is a hack. If we don't put this the first keystoke
        // from the alp at / doesn't work (i.e. to go from current alp to current alp - 1 would take two arrow presses)
        if (onDisplayAuctionAlpId === lastAuctionAlpId) {
          history.push(`/alp/${lastAuctionAlpId}`);
        }

        if (!isFirstAuction) {
          onPrevAuctionClick();
        }
      }
      if (event.key === 'ArrowRight') {
        if (!isLastAuction) {
          onNextAuctionClick();
        }
      }
    },
    [
      browsing,
      history,
      isFirstAuction,
      isLastAuction,
      lastAuctionAlpId,
      onDisplayAuctionAlpId,
      onNextAuctionClick,
      onPrevAuctionClick,
    ],
  );

  useEffect(() => {
    // attach the event listener
    document.addEventListener('keydown', handleKeyPress);

    // remove the event listener
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <div className={classes.navArrowsContainer}>
      <button
        onClick={() => onPrevAuctionClick()}
        className={isCool ? classes.leftArrowCool : classes.leftArrowWarm}
        disabled={isFirstAuction}
      >
        ←
      </button>
      <button
        onClick={() => onNextAuctionClick()}
        className={isCool ? classes.rightArrowCool : classes.rightArrowWarm}
        disabled={isLastAuction}
      >
        →
      </button>
      <button
        onClick={() => setBrowsing(true)}
        className={`${classes.browse} ${isCool ? classes.browseCool : classes.browseWarm}`}
        aria-haspopup="dialog"
      >
        <FontAwesomeIcon icon={faThLarge} />
        <Trans>Browse</Trans>
      </button>
      {browsing && <AlpBrowser currentId={onDisplayAuctionAlpId} onDismiss={closeBrowser} />}
    </div>
  );
};
export default AuctionNavigation;
