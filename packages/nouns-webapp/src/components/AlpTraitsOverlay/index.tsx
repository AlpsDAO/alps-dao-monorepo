import React from 'react';
import ReactTooltip from 'react-tooltip';
import AlpTraitList from '../AlpTraitList';

// Phones have no hover, and a tap would open this tooltip on top of the traits button's panel
const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

/** The main Alp's traits in a tooltip that follows the pointer while it's over the Alp (desktop). */
const AlpTraitsOverlay: React.FC<{
  parts: { filename: string }[];
  background: string;
}> = ({ parts, background }) => (
  <ReactTooltip
    id="alp-traits"
    place="top"
    effect="float"
    backgroundColor="white"
    textColor="black"
    disable={!canHover}
  >
    <AlpTraitList parts={parts} background={background} variant="tooltip" />
  </ReactTooltip>
);

export default AlpTraitsOverlay;
