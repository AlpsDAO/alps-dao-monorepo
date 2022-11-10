import { getGrayBackgroundSVG } from '../../utils/grayBackgroundSVG';
import alpClasses from '../Alp/Alp.module.css';
import Alp from '../Alp';
import classes from './GrayCircle.module.css';

interface GrayCircleProps {
  isDelegateView?: boolean;
}

export const GrayCircle: React.FC<GrayCircleProps> = props => {
  const { isDelegateView } = props;
  return (
    <div className={isDelegateView ? classes.wrapper : ''}>
      <Alp
        imgPath={getGrayBackgroundSVG()}
        alt={''}
        wrapperClassName={
          isDelegateView ? alpClasses.delegateViewCircularAlpWrapper : alpClasses.circularAlpWrapper
        }
        className={isDelegateView ? alpClasses.delegateViewCircular : alpClasses.circular}
      />
    </div>
  );
};
