import { Contract } from 'ethers';

export enum ChainId {
  Mainnet = 1,
  Ropsten = 3,
  Rinkeby = 4,
  Goerli = 5,
  Kovan = 42,
}

// prettier-ignore
export type DescriptorV1ContractNames = 'NFTDescriptor' | 'AlpsDescriptor';
// prettier-ignore
export type DescriptorV2ContractNames = 'NFTDescriptorV2' | 'AlpsDescriptorV2' | 'SVGRenderer' | 'AlpsArt' | 'Inflator';
// prettier-ignore
export type ContractName = DescriptorV2ContractNames | 'AlpsSeeder' | 'AlpsToken' | 'AlpsAuctionHouse' | 'AlpsAuctionHouseProxyAdmin' | 'AlpsAuctionHouseProxy' | 'AlpsDAOExecutor' | 'AlpsDAOLogicV1' | 'AlpsDAOProxy' | 'AlpsAttribute';
// prettier-ignore
export type ContractNameDescriptorV1 = DescriptorV1ContractNames | 'AlpsSeeder' | 'AlpsToken' | 'AlpsAuctionHouse' | 'AlpsAuctionHouseProxyAdmin' | 'AlpsAuctionHouseProxy' | 'AlpsDAOExecutor' | 'AlpsDAOLogicV1' | 'AlpsDAOProxy';
// prettier-ignore
export type ContractNamesDAOV2 = Exclude<ContractName, 'AlpsDAOLogicV1' | 'AlpsDAOProxy'> | 'AlpsDAOLogicV2' | 'AlpsDAOProxyV2';

export interface ContractDeployment {
  args?: (string | number | (() => string))[];
  libraries?: () => Record<string, string>;
  waitForConfirmation?: boolean;
  validateDeployment?: () => void;
}

export interface DeployedContract {
  name: string;
  address: string;
  instance: Contract;
  constructorArguments: (string | number)[];
  libraries: Record<string, string>;
}

export interface ContractRow {
  Address: string;
  'Deployment Hash'?: string;
}
