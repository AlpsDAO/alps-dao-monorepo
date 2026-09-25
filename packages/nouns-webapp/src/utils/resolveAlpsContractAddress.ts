import config from '../config';

export const resolveAlpContractAddress = (address: string) => {
  switch (address.toLowerCase()) {
    case config.addresses.alpsDAOProxy.toLowerCase():
      return 'Alps Governance';
    case config.addresses.alpsAuctionHouseProxy.toLowerCase():
      return 'Alps Auction House Proxy';
    case config.addresses.alpsDaoExecutor.toLowerCase():
      return 'Alps Treasury';
    default:
      return undefined;
  }
};
