import React from 'react';
import ReactTooltip from 'react-tooltip';
import AlpTraitList from '../AlpTraitList';
import { AlpTraits } from '../../utils/alpArt';

// Phones have no hover, and a tap would open this tooltip on top of the traits button's panel
const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

/** The main Alp's traits in a tooltip that follows the pointer while it's over the Alp (desktop). */
const AlpTraitsOverlay: React.FC<{ traits: AlpTraits }> = ({ traits }) => (
  <ReactTooltip
    id="alp-traits"
    place="top"
    effect="float"
    backgroundColor="white"
    textColor="black"
    disable={!canHover}
  >
    <AlpTraitList traits={traits} variant="tooltip" />
  </ReactTooltip>
);

export default AlpTraitsOverlay;
