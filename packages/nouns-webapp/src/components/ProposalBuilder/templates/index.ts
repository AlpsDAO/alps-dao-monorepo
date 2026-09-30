import { ActionKind } from '../types';
import { ActionTemplate } from './types';
import sendEth from './SendEth';
import sendToken from './SendToken';
import sendAlp from './SendAlp';
import auctionSettings from './AuctionSettings';
import governorSettings from './GovernorSettings';
import treasuryDelay from './TreasuryDelay';
import contractCall from './ContractCall';
import rawTransaction from './RawTransaction';

/** In the order the "Add an action" menu shows them */
export const TEMPLATES: ActionTemplate[] = [
  sendEth,
  sendToken,
  sendAlp,
  auctionSettings,
  governorSettings,
  treasuryDelay,
  contractCall,
  rawTransaction,
];

export const templateFor = (kind: ActionKind) => TEMPLATES.find(t => t.kind === kind) ?? rawTransaction;
