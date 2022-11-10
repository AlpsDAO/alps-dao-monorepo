import config from '../config';

export const resolveAlpContractAddress = (address: string) => {
  switch (address.toLowerCase()) {
    case config.addresses.alpsDAOProxy.toLowerCase():
      return 'Alps DAO Proxy';
    case config.addresses.alpsAuctionHouseProxy.toLowerCase():
      return 'Alps Auction House Proxy';
    case config.addresses.alpsDaoExecutor.toLowerCase():
      return 'Alps DAO Treasury';
    default:
      return undefined;
  }
};
