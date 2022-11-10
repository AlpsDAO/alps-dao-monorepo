import { BigNumber } from 'ethers';
import React from 'react';
import { StandaloneAlpCircular } from '../StandaloneAlp';
import classes from './HorizontalStackedAlps.module.css';

interface HorizontalStackedAlpsProps {
  alpIds: string[];
}

const HorizontalStackedAlps: React.FC<HorizontalStackedAlpsProps> = props => {
  const { alpIds } = props;
  return (
    <div className={classes.wrapper}>
      {alpIds
        .slice(0, 6)
        .map((alpId: string, i: number) => {
          return (
            <div
              key={alpId.toString()}
              style={{
                top: '0px',
                left: `${25 * i}px`,
              }}
              className={classes.alpWrapper}
            >
              <StandaloneAlpCircular alpId={BigNumber.from(alpId)} border={true} />
            </div>
          );
        })
        .reverse()}
    </div>
  );
};

export default HorizontalStackedAlps;
