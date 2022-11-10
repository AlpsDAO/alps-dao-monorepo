import {
  AlpsTokenFactory,
  AlpsAuctionHouseFactory,
  AlpsDescriptorFactory,
  AlpsSeederFactory,
  AlpsDaoLogicV1Factory,
} from '@nouns/contracts';

export interface ContractAddresses {
  alpsToken: string;
  alpsSeeder: string;
  alpsDescriptor: string;
  nftDescriptor: string;
  alpsAuctionHouse: string;
  alpsAuctionHouseProxy: string;
  alpsAuctionHouseProxyAdmin: string;
  alpsDaoExecutor: string;
  alpsDAOProxy: string;
  alpsDAOLogicV1: string;
}

export interface Contracts {
  alpsTokenContract: ReturnType<typeof AlpsTokenFactory.connect>;
  alpsAuctionHouseContract: ReturnType<typeof AlpsAuctionHouseFactory.connect>;
  alpsDescriptorContract: ReturnType<typeof AlpsDescriptorFactory.connect>;
  alpsSeederContract: ReturnType<typeof AlpsSeederFactory.connect>;
  alpsDaoContract: ReturnType<typeof AlpsDaoLogicV1Factory.connect>;
}

export enum ChainId {
  Mainnet = 1,
  Ropsten = 3,
  Rinkeby = 4,
  Kovan = 42,
  Local = 31337,
}
