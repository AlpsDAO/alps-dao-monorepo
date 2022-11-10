import React from 'react';
import { Collapse } from 'react-bootstrap';
import {
  DelegationEvent,
  AlpEventType,
  AlpProfileEvent,
  AlpWinEvent,
  ProposalVoteEvent,
  TransferEvent,
} from '../../wrappers/alpActivity';
import MobileDelegationEvent from '../profileEvent/event/MobileDelegationEvent';
import MobileAlpWinEvent from '../profileEvent/event/MobileAlpWinEvent';
import MobileProposalVoteEvent from '../profileEvent/event/MobileProposalVoteEvent';
import MobileTransferEvent from '../profileEvent/event/MobileTransferEvent';

interface MobileProfileActivityFeedProps {
  events: AlpProfileEvent[];
  aboveFoldEventCount: number;
  isExpanded: boolean;
}

const getComponentFromEvent = (event: AlpProfileEvent, key: number) => {
  if (event.eventType === AlpEventType.PROPOSAL_VOTE) {
    return <MobileProposalVoteEvent event={event.payload as ProposalVoteEvent} key={key} />;
  }

  if (event.eventType === AlpEventType.DELEGATION) {
    return <MobileDelegationEvent event={event.payload as DelegationEvent} key={key} />;
  }

  if (event.eventType === AlpEventType.TRANSFER) {
    return <MobileTransferEvent event={event.payload as TransferEvent} key={key} />;
  }

  if (event.eventType === AlpEventType.AUCTION_WIN) {
    return <MobileAlpWinEvent event={event.payload as AlpWinEvent} key={key} />;
  }
};

const MobileProfileActivityFeed: React.FC<MobileProfileActivityFeedProps> = props => {
  const { events, aboveFoldEventCount, isExpanded } = props;

  return (
    <>
      {events
        .slice(0)
        .slice(0, aboveFoldEventCount)
        .map((event: AlpProfileEvent, i: number) => {
          return getComponentFromEvent(event, i);
        })}
      <Collapse in={isExpanded}>
        <>
          {events
            .slice(0)
            .slice(aboveFoldEventCount, events.length)
            .map((event: AlpProfileEvent, i: number) => {
              return getComponentFromEvent(event, i);
            })}
        </>
      </Collapse>
    </>
  );
};

export default MobileProfileActivityFeed;
