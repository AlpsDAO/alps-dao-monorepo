import { useAlpSeed } from '../../wrappers/alpToken';
import { BigNumber } from 'ethers';
import { useAlp } from '../StandaloneAlp';
import { LoadingAlp } from '../Alp';

interface TightStackedCircleAlpProps {
  alpId: number;
  index: number;
  square: number;
  shift: number;
}

const TightStackedCircleAlp: React.FC<TightStackedCircleAlpProps> = props => {
  const { alpId, index, square, shift } = props;
  const seed = useAlpSeed(BigNumber.from(alpId));
  const alpData = useAlp(String(alpId), seed);

  if (!alpData) {
    return <LoadingAlp />;
  }

  const image = alpData.image;

  return (
    <g key={index}>
      <clipPath id={`clipCircleAlp${alpId}`}>
        <circle
          id={`${alpId}`}
          r="20"
          cx={28 + index * shift}
          cy={square - 21 - index * shift}
          style={{
            fill: 'none',
            stroke: 'white',
            strokeWidth: '2',
          }}
        />
      </clipPath>

      <use xlinkHref={`#${alpId}`} />
      <image
        clipPath={`url(#clipCircleAlp${alpId})`}
        x={8 + index * shift}
        y={14 - index * shift}
        width="40"
        height="40"
        href={image}
      ></image>
    </g>
  );
};

export default TightStackedCircleAlp;
