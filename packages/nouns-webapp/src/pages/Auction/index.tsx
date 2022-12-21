import Banner from '../../components/Banner';
import Auction from '../../components/Auction';
import Documentation from '../../components/Documentation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { setOnDisplayAuctionAlpId } from '../../state/slices/onDisplayAuction';
import { push } from 'connected-react-router';
import { alpPath } from '../../utils/history';
import useOnDisplayAuction from '../../wrappers/onDisplayAuction';
import { useEffect } from 'react';
// import ProfileActivityFeed from '../../components/ProfileActivityFeed';

interface AuctionPageProps {
  initialAuctionId?: number;
}

const AuctionPage: React.FC<AuctionPageProps> = props => {
  const { initialAuctionId } = props;
  const onDisplayAuction = useOnDisplayAuction();
  const lastAuctionAlpId = useAppSelector(state => state.onDisplayAuction.lastAuctionAlpId);
  const onDisplayAuctionAlpId = onDisplayAuction?.alpId.toNumber();

  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!lastAuctionAlpId) return;

    if (initialAuctionId !== undefined) {
      // handle out of bounds alp path ids
      if (initialAuctionId > lastAuctionAlpId || initialAuctionId < 0) {
        dispatch(setOnDisplayAuctionAlpId(lastAuctionAlpId));
        dispatch(push(alpPath(lastAuctionAlpId)));
      } else {
        if (onDisplayAuction === undefined) {
          // handle regular alp path ids on first load
          dispatch(setOnDisplayAuctionAlpId(initialAuctionId));
        }
      }
    } else {
      // no alp path id set
      if (lastAuctionAlpId) {
        dispatch(setOnDisplayAuctionAlpId(lastAuctionAlpId));
      }
    }
  }, [lastAuctionAlpId, dispatch, initialAuctionId, onDisplayAuction]);

  return (
    <>
      <Auction auction={onDisplayAuction} />
      {onDisplayAuctionAlpId !== undefined && onDisplayAuctionAlpId !== lastAuctionAlpId ? (
        // <ProfileActivityFeed alpId={onDisplayAuctionAlpId} />
        <></>
      ) : (
        <Banner />
      )}
      <Documentation />
    </>
  );
};
export default AuctionPage;
