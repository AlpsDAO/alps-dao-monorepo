import React from 'react';
import { Collapse, Table } from 'react-bootstrap';
import {
  DelegationEvent,
  AlpEventType,
  AlpProfileEvent,
  AlpWinEvent,
  ProposalVoteEvent,
  TransferEvent,
} from '../../wrappers/alpActivity';
import BrandSpinner from '../BrandSpinner';
import DesktopDelegationEvent from '../profileEvent/event/DesktopDelegationEvent';
import DesktopAlpWinEvent from '../profileEvent/event/DesktopAlpWinEvent';
import DesktopProposalVoteEvent from '../profileEvent/event/DesktopProposalVoteEvent';
import DesktopTransferEvent from '../profileEvent/event/DesktopTransferEvent';
import classes from './DesktopProfileActivityFeed.module.css';

interface DesktopProfileActivityFeedProps {
  events: AlpProfileEvent[];
  aboveFoldEventCount: number;
  isExpanded: boolean;
}

const getComponentFromEvent = (event: AlpProfileEvent, key: number) => {
  if (event.eventType === AlpEventType.PROPOSAL_VOTE) {
    return <DesktopProposalVoteEvent event={event.payload as ProposalVoteEvent} key={key} />;
  }

  if (event.eventType === AlpEventType.DELEGATION) {
    return <DesktopDelegationEvent event={event.payload as DelegationEvent} key={key} />;
  }

  if (event.eventType === AlpEventType.TRANSFER) {
    return <DesktopTransferEvent event={event.payload as TransferEvent} key={key} />;
  }

  if (event.eventType === AlpEventType.AUCTION_WIN) {
    return <DesktopAlpWinEvent event={event.payload as AlpWinEvent} key={key} />;
  }
};

const DesktopProfileActivityFeed: React.FC<DesktopProfileActivityFeedProps> = props => {
  const { events, aboveFoldEventCount, isExpanded } = props;

  return (
    <>
      <Table responsive hover className={classes.aboveTheFoldEventsTable}>
        <tbody className={classes.alpInfoPadding}>
          {events?.length ? (
            events.slice(0, aboveFoldEventCount).map((event: AlpProfileEvent, i: number) => {
              return getComponentFromEvent(event, i);
            })
          ) : (
            <BrandSpinner />
          )}
        </tbody>
      </Table>
      <Collapse in={isExpanded}>
        <Table responsive hover>
          <tbody className={classes.alpInfoPadding}>
            {events?.length ? (
              events
                .slice(aboveFoldEventCount, events.length)
                .map((event: AlpProfileEvent, i: number) => {
                  return getComponentFromEvent(event, i);
                })
            ) : (
              <BrandSpinner />
            )}
          </tbody>
        </Table>
      </Collapse>
    </>
  );
};

export default DesktopProfileActivityFeed;
