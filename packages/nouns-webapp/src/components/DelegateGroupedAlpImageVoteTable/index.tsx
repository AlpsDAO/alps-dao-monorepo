import React, { useState } from 'react';
import { pseudoRandomPredictableShuffle } from '../../utils/pseudoRandomPredictableShuffle';
import DelegateHoverCard from '../DelegateHoverCard';
import { GrayCircle } from '../GrayCircle';
import HoverCard from '../HoverCard';
import TightStackedCircleAlps from '../TightStackedCircleAlps';
import classes from './DelegateGroupedAlpImageVoteTable.module.css';
import VoteCardPager from '../VoteCardPager';

interface DelegateGruopedAlpImageVoteTableProps {
  filteredDelegateGroupedVoteData:
    | { delegate: string; supportDetailed: 0 | 1 | 2; alpsRepresented: string[] }[]
    | undefined;
  propId: number;
  proposalCreationBlock: number;
}

const NOUNS_PER_VOTE_CARD_DESKTOP = 12;

const DelegateGruopedAlpImageVoteTable: React.FC<DelegateGruopedAlpImageVoteTableProps> = props => {
  const { filteredDelegateGroupedVoteData, propId, proposalCreationBlock } = props;

  const shuffledDelegatedGroupedAlps = pseudoRandomPredictableShuffle(
    filteredDelegateGroupedVoteData,
    propId,
  );
  const [page, setPage] = useState<number>(0);

  const content = (page: number) => {
    const rows = 3;
    const rowLength = 4;

    const paddedAlpIds = shuffledDelegatedGroupedAlps
      .map((data: { delegate: string; supportDetailed: 0 | 1 | 2; alpsRepresented: string[] }) => {
        return (
          <HoverCard
            hoverCardContent={(tip: string) => (
              <DelegateHoverCard delegateId={tip} proposalCreationBlock={proposalCreationBlock} />
            )}
            // We add this prefix to prevent collisions with the Alp info cards
            tip={`delegate-${data.delegate}`}
            id="delegateVoteHoverCard"
          >
            <TightStackedCircleAlps
              alpIds={data.alpsRepresented.map((alpId: string) => parseInt(alpId))}
            />
          </HoverCard>
        );
      })
      .slice(page * NOUNS_PER_VOTE_CARD_DESKTOP, (page + 1) * NOUNS_PER_VOTE_CARD_DESKTOP)
      .concat(Array(NOUNS_PER_VOTE_CARD_DESKTOP).fill(<GrayCircle isDelegateView={true} />));

    return Array(rows)
      .fill(0)
      .map((_, i) => (
        <tr key={i}>
          {Array(rowLength)
            .fill(0)
            .map((_, j) => (
              <td className={classes.alpCell} key={j}>
                {paddedAlpIds[i * rowLength + j]}
              </td>
            ))}
        </tr>
      ));
  };

  return (
    <>
      <table className={classes.wrapper}>
        <tbody>{content(page)}</tbody>
      </table>
      <VoteCardPager
        onLeftArrowClick={() => setPage(page - 1)}
        onRightArrowClick={() => setPage(page + 1)}
        isLeftArrowDisabled={page === 0}
        isRightArrowDisabled={
          (page + 1) * NOUNS_PER_VOTE_CARD_DESKTOP > shuffledDelegatedGroupedAlps.length
        }
        numPages={Math.floor(shuffledDelegatedGroupedAlps.length / NOUNS_PER_VOTE_CARD_DESKTOP) + 1}
        currentPage={page}
      />
    </>
  );
};

export default DelegateGruopedAlpImageVoteTable;
