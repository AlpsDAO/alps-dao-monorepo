import { BigNumber, BigNumberish } from 'ethers';
import Section from '../../layout/Section';
import classes from './HistoryCollection.module.css';
import clsx from 'clsx';
import StandaloneAlp from '../StandaloneAlp';
import { LoadingAlp } from '../Alp';
import config from '../../config';
import { Container, Row } from 'react-bootstrap';

interface HistoryCollectionProps {
  historyCount: number;
  latestAlpId: BigNumberish;
}

const HistoryCollection: React.FC<HistoryCollectionProps> = (props: HistoryCollectionProps) => {
  const { historyCount, latestAlpId } = props;

  if (!latestAlpId) return null;

  const startAtZero = BigNumber.from(latestAlpId).sub(historyCount).lt(0);

  let alpIds: Array<BigNumber | null> = new Array(historyCount);
  alpIds = alpIds.fill(null).map((_, i) => {
    if (BigNumber.from(i).lt(latestAlpId)) {
      const index = startAtZero
        ? BigNumber.from(0)
        : BigNumber.from(Number(latestAlpId) - historyCount);
      return index.add(i);
    } else {
      return null;
    }
  });

  const alpsContent = alpIds.map((alpId, i) => {
    return !alpId ? <LoadingAlp key={i} /> : <StandaloneAlp key={i} alpId={alpId} />;
  });

  return (
    <Section fullWidth={true}>
      <Container fluid>
        <Row className="justify-content-md-center">
          <div className={clsx(classes.historyCollection)}>
            {config.app.enableHistory && alpsContent}
          </div>
        </Row>
      </Container>
    </Section>
  );
};

export default HistoryCollection;
