import {
  AlpsTokenFactory,
  AlpsAuctionHouseFactory,
  AlpsDescriptorFactory,
  AlpsSeederFactory,
  AlpsDaoLogicV1Factory,
} from '@nouns/contracts';
import type { Signer } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import { getContractAddressesForChainOrThrow } from './addresses';
import { Contracts } from './types';

/**
 * Get contract instances that target the Ethereum mainnet
 * or a supported testnet. Throws if there are no known contracts
 * deployed on the corresponding chain.
 * @param chainId The desired chain id
 * @param signerOrProvider The ethers v5 signer or provider
 */
export const getContractsForChainOrThrow = (
  chainId: number,
  signerOrProvider?: Signer | Provider,
): Contracts => {
  const addresses = getContractAddressesForChainOrThrow(chainId);

  return {
    alpsTokenContract: AlpsTokenFactory.connect(
      addresses.alpsToken,
      signerOrProvider as Signer | Provider,
    ),
    alpsAuctionHouseContract: AlpsAuctionHouseFactory.connect(
      addresses.alpsAuctionHouseProxy,
      signerOrProvider as Signer | Provider,
    ),
    alpsDescriptorContract: AlpsDescriptorFactory.connect(
      addresses.alpsDescriptor,
      signerOrProvider as Signer | Provider,
    ),
    alpsSeederContract: AlpsSeederFactory.connect(
      addresses.alpsSeeder,
      signerOrProvider as Signer | Provider,
    ),
    alpsDaoContract: AlpsDaoLogicV1Factory.connect(
      addresses.alpsDAOProxy,
      signerOrProvider as Signer | Provider,
    ),
  };
};
