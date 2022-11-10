import React from 'react';
import TightStackedCircleAlp from '../TightStackedCircleAlp';

interface StackedCircleAlpsProps {
  alpIds: Array<number>;
}

const MAX_NOUNS_PER_STACK = 3;

const TightStackedCircleAlps: React.FC<StackedCircleAlpsProps> = props => {
  const { alpIds } = props;

  const shift = 3;

  const square = 55;

  return (
    <svg width={square} height={square}>
      {alpIds
        .slice(0, MAX_NOUNS_PER_STACK)
        .map((alpId: number, i: number) => {
          return <TightStackedCircleAlp alpId={alpId} index={i} square={square} shift={shift} />;
        })
        .reverse()}
    </svg>
  );
};

export default TightStackedCircleAlps;
