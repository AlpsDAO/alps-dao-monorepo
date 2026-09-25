import { Auction } from '../../wrappers/alpsAuction';
import { useAppSelector } from '../../hooks';
import React, { useEffect, useState, useRef, ChangeEvent, useCallback } from 'react';
import { utils, BigNumber as EthersBN } from 'ethers';
import BigNumber from 'bignumber.js';
import classes from './Bid.module.css';
import { Spinner, InputGroup, FormControl, Button } from 'react-bootstrap';
import { useAuctionMinBidIncPercentage } from '../../wrappers/alpsAuction';
import { useAppDispatch } from '../../hooks';
import { AlertModal, setAlertModal } from '../../state/slices/application';
import WalletConnectModal from '../WalletConnectModal';
import KickOffAuction from '../KickOffAuction';
import SafeTxNotice from '../SafeTxNotice';
import { Trans } from '@lingui/macro';
import { useActiveLocale } from '../../hooks/useActivateLocale';
import responsiveUiUtilsClasses from '../../utils/ResponsiveUIUtils.module.css';
import { useTransaction } from '../../hooks/useTransaction';
import { useContracts } from '../../hooks/useContracts';

const computeMinimumNextBid = (
  currentBid: BigNumber,
  minBidIncPercentage: BigNumber | undefined,
): BigNumber => {
  if (!minBidIncPercentage) {
    return new BigNumber(0);
  }
  return currentBid
    .times(minBidIncPercentage.div(100).plus(1))
    .decimalPlaces(0, BigNumber.ROUND_UP);
};

const minBidEth = (minBid: BigNumber): string => {
  if (minBid.isZero()) {
    return '0.08';
  }

  const eth = utils.formatEther(EthersBN.from(minBid.toString()));
  return new BigNumber(eth).toFixed(4, BigNumber.ROUND_CEIL);
};

const currentBid = (bidInputRef: React.RefObject<HTMLInputElement>) => {
  if (!bidInputRef.current || !bidInputRef.current.value) {
    return new BigNumber(0);
  }
  return new BigNumber(utils.parseEther(bidInputRef.current.value).toString());
};

const Bid: React.FC<{
  auction: Auction;
  auctionEnded: boolean;
}> = props => {
  const activeAccount = useAppSelector(state => state.account.activeAccount);
  const { alpsAuctionHouseProxy } = useContracts();
  let { auction, auctionEnded } = props;
  const activeLocale = useActiveLocale();

  const account = useAppSelector(state => state.account.activeAccount);

  const bidInputRef = useRef<HTMLInputElement>(null);

  const [bidInput, setBidInput] = useState('');

  const [bidButtonContent, setBidButtonContent] = useState({
    loading: false,
    content: auctionEnded ? <Trans>Settle</Trans> : <Trans>Place bid</Trans>,
  });

  const [showConnectModal, setShowConnectModal] = useState(false);

  const hideModalHandler = () => {
    setShowConnectModal(false);
  };

  const dispatch = useAppDispatch();
  const setModal = useCallback((modal: AlertModal) => dispatch(setAlertModal(modal)), [dispatch]);

  const minBidIncPercentage = useAuctionMinBidIncPercentage();
  const minBid = computeMinimumNextBid(
    auction && new BigNumber(auction.amount.toString()),
    minBidIncPercentage,
  );

  const { transact: transactBid, status: placeBidState } = useTransaction();
  const { transact: settleAuction, status: settleAuctionState } = useTransaction();

  const bidInputHandler = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value;

    // disable more than 2 digits after decimal point
    if (input.includes('.') && event.target.value.split('.')[1].length > 11) {
      return;
    }

    setBidInput(event.target.value);
  };

  const placeBidHandler = async () => {
    if (!activeAccount) {
      setShowConnectModal(true);
      return;
    }
    if (!auction || !bidInputRef.current || !bidInputRef.current.value || !alpsAuctionHouseProxy) {
      return;
    }

    if (currentBid(bidInputRef).isLessThan(minBid)) {
      setModal({
        show: true,
        title: <Trans>Insufficient bid amount 🤏</Trans>,
        message: (
          <Trans>
            Please place a bid higher than or equal to the minimum bid amount of {minBidEth(minBid)}{' '}
            ETH
          </Trans>
        ),
      });
      setBidInput(minBidEth(minBid));
      return;
    }

    const value = utils.parseEther(bidInputRef.current.value.toString());
    const gasLimit = await alpsAuctionHouseProxy.estimateGas.createBid(auction.alpId, {
      value,
    });
    transactBid(alpsAuctionHouseProxy.createBid(auction.alpId, {
      value,
      gasLimit: gasLimit.add(10_000), // A 10,000 gas pad is used to avoid 'Out of gas' errors
    }));
  };

  const settleAuctionHandler = () => {
    // Anyone can kick off the next auction; they just need a wallet to pay the gas
    if (!activeAccount) {
      setShowConnectModal(true);
      return;
    }
    if (!alpsAuctionHouseProxy) return;
    settleAuction(alpsAuctionHouseProxy.settleCurrentAndCreateNewAuction());
  };

  const clearBidInput = () => {
    if (bidInputRef.current) {
      bidInputRef.current.value = '';
    }
  };

  // successful bid using redux store state
  useEffect(() => {
    if (!account) return;

    // tx state is mining
    const isMiningUserTx = placeBidState.status === 'Mining';
    // allows user to rebid against themselves so long as it is not the same tx
    const isCorrectTx = currentBid(bidInputRef).isEqualTo(new BigNumber(auction.amount.toString()));
    if (isMiningUserTx && auction.bidder === account && isCorrectTx) {
      placeBidState.status = 'Success';
      setModal({
        title: <Trans>Success</Trans>,
        message: <Trans>Bid was placed successfully!</Trans>,
        show: true,
      });
      setBidButtonContent({ loading: false, content: <Trans>Place bid</Trans> });
      clearBidInput();
    }
  }, [auction, placeBidState, account, setModal]);

  // placing bid transaction state hook
  useEffect(() => {
    switch (!auctionEnded && placeBidState.status) {
      case 'None':
        setBidButtonContent({
          loading: false,
          content: <Trans>Place bid</Trans>,
        });
        break;
      case 'QueuedInSafe':
        setModal({
          title: <Trans>Sent to your Safe</Trans>,
          message: placeBidState.safeTx && <SafeTxNotice safeTx={placeBidState.safeTx} />,
          show: true,
        });
        setBidButtonContent({ loading: false, content: <Trans>Place bid</Trans> });
        break;
      case 'Mining':
        setBidButtonContent({ loading: true, content: <></> });
        break;
      case 'Fail':
        setModal({
          title: <Trans>Transaction Failed</Trans>,
          message: placeBidState?.errorMessage || <Trans>Please try again.</Trans>,
          show: true,
        });
        setBidButtonContent({ loading: false, content: <Trans>Bid</Trans> });
        break;
      case 'Exception':
        setModal({
          title: <Trans>Error</Trans>,
          message: placeBidState?.errorMessage || <Trans>Please try again.</Trans>,
          show: true,
        });
        setBidButtonContent({ loading: false, content: <Trans>Bid</Trans> });
        break;
    }
  }, [placeBidState, auctionEnded, setModal]);

  // Kick-off (settle) transaction state hook. Not tied to auctionEnded: by the time the transaction
  // confirms, the new auction has usually already replaced the ended one
  useEffect(() => {
    switch (settleAuctionState.status) {
      case 'QueuedInSafe':
        setModal({
          title: <Trans>Sent to your Safe</Trans>,
          message: settleAuctionState.safeTx && <SafeTxNotice safeTx={settleAuctionState.safeTx} />,
          show: true,
        });
        break;
      case 'Success':
        setModal({
          title: <Trans>Success</Trans>,
          message: <Trans>The next auction has started!</Trans>,
          show: true,
        });
        break;
      case 'Fail':
        setModal({
          title: <Trans>Transaction Failed</Trans>,
          message: settleAuctionState?.errorMessage || <Trans>Please try again.</Trans>,
          show: true,
        });
        break;
      case 'Exception':
        setModal({
          title: <Trans>Error</Trans>,
          message: settleAuctionState?.errorMessage || <Trans>Please try again.</Trans>,
          show: true,
        });
        break;
    }
  }, [settleAuctionState, setModal]);

  if (!auction) return null;

  // Not disabled when disconnected: tapping opens the wallet picker instead
  const isDisabled = placeBidState.status === 'Mining' || settleAuctionState.status === 'Mining';

  return (
    <>
      {showConnectModal && activeAccount === undefined && (
        <WalletConnectModal onDismiss={hideModalHandler} />
      )}
      <InputGroup>
        {!auctionEnded && (
          <>
            <span className={classes.customPlaceholderBidAmt}>
              {!auctionEnded && !bidInput ? (
                <>
                  Ξ {minBidEth(minBid)}{' '}
                  <span
                    className={
                      activeLocale === 'ja-JP' ? responsiveUiUtilsClasses.disableSmallScreens : ''
                    }
                  >
                    <Trans>or more</Trans>
                  </span>
                </>
              ) : (
                ''
              )}
            </span>
            <FormControl
              className={classes.bidInput}
              type="number"
              min="0"
              onChange={bidInputHandler}
              ref={bidInputRef}
              value={bidInput}
            />
          </>
        )}
        {!auctionEnded ? (
          <Button
            className={auctionEnded ? classes.bidBtnAuctionEnded : classes.bidBtn}
            onClick={auctionEnded ? settleAuctionHandler : placeBidHandler}
            disabled={isDisabled}
          >
            {bidButtonContent.loading ? <Spinner animation="border" /> : bidButtonContent.content}
          </Button>
        ) : (
          <KickOffAuction
            auction={auction}
            pending={
              settleAuctionState.status === 'PendingSignature' || settleAuctionState.status === 'Mining'
            }
            onKickOff={settleAuctionHandler}
          />
        )}
      </InputGroup>
    </>
  );
};
export default Bid;
