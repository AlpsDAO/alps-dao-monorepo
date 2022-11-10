import { StandaloneAlpCircular } from '../../components/StandaloneAlp';
import { BigNumber as EthersBN } from 'ethers';
import classes from './AlpImageVoteTable.module.css';
import { GrayCircle } from '../GrayCircle';
import { pseudoRandomPredictableShuffle } from '../../utils/pseudoRandomPredictableShuffle';
import HoverCard from '../HoverCard';
import AlpHoverCard from '../AlpHoverCard';
import React, { useState } from 'react';
import VoteCardPager from '../VoteCardPager';

interface AlpImageVoteTableProps {
  alpIds: string[];
  propId: number;
}
const NOUNS_PER_VOTE_CARD_DESKTOP = 15;

const isXLScreen = window.innerWidth > 1200;

const AlpImageVoteTable: React.FC<AlpImageVoteTableProps> = props => {
  const { alpIds, propId } = props;

  const shuffledAlpIds = pseudoRandomPredictableShuffle(alpIds, propId);
  const [page, setPage] = useState(0);

  const content = (page: number) => {
    const rows = 3;
    const rowLength = isXLScreen ? 5 : 4;

    const paddedAlpIds = shuffledAlpIds
      .map((alpId: string) => {
        return (
          <HoverCard
            hoverCardContent={(tip: string) => <AlpHoverCard alpId={tip} />}
            tip={alpId.toString()}
            id="alpHoverCard"
          >
            <StandaloneAlpCircular alpId={EthersBN.from(alpId)} />
          </HoverCard>
        );
      })
      .slice(page * NOUNS_PER_VOTE_CARD_DESKTOP, (page + 1) * NOUNS_PER_VOTE_CARD_DESKTOP)
      .concat(Array(NOUNS_PER_VOTE_CARD_DESKTOP).fill(<GrayCircle />));

    return Array(rows)
      .fill(0)
      .map((_, i) => (
        <tr key={i}>
          {Array(rowLength)
            .fill(0)
            .map((_, j) => (
              <td key={j}>{paddedAlpIds[i * rowLength + j]}</td>
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
        isRightArrowDisabled={(page + 1) * NOUNS_PER_VOTE_CARD_DESKTOP > alpIds.length}
        numPages={Math.floor(alpIds.length / NOUNS_PER_VOTE_CARD_DESKTOP) + 1}
        currentPage={page}
      />
    </>
  );
};

export default AlpImageVoteTable;
