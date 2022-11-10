import { task, types } from 'hardhat/config';
import { ContractNamesDAOV2, DeployedContract } from './types';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

task('update-configs-daov2', 'Write the deployed addresses to the SDK and subgraph configs')
  .addParam('contracts', 'Contract objects from the deployment', undefined, types.json)
  .setAction(
    async (
      { contracts }: { contracts: Record<ContractNamesDAOV2, DeployedContract> },
      { ethers },
    ) => {
      const { name: network, chainId } = await ethers.provider.getNetwork();

      // Update SDK addresses
      const sdkPath = join(__dirname, '../../alps-sdk');
      const addressesPath = join(sdkPath, 'src/contract/addresses.json');
      const addresses = JSON.parse(readFileSync(addressesPath, 'utf8'));
      addresses[chainId] = {
        alpsToken: contracts.AlpsToken.address,
        alpsSeeder: contracts.AlpsSeeder.address,
        alpsDescriptor: contracts.AlpsDescriptorV2.address,
        nftDescriptor: contracts.NFTDescriptorV2.address,
        alpsAuctionHouse: contracts.AlpsAuctionHouse.address,
        alpsAuctionHouseProxy: contracts.AlpsAuctionHouseProxy.address,
        alpsAuctionHouseProxyAdmin: contracts.AlpsAuctionHouseProxyAdmin.address,
        alpsDaoExecutor: contracts.AlpsDAOExecutor.address,
        alpsDAOProxy: contracts.AlpsDAOProxyV2.address,
        alpsDAOLogicV1: contracts.AlpsDAOLogicV2.address,
      };
      writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
      try {
        execSync('yarn build', {
          cwd: sdkPath,
        });
      } catch {
        console.log('Failed to re-build `@alps/sdk`. Please rebuild manually.');
      }
      console.log('Addresses written to the Alps SDK.');

      // Generate subgraph config
      const configName = `${network}-fork`;
      const subgraphConfigPath = join(__dirname, `../../alps-subgraph/config/${configName}.json`);
      const subgraphConfig = {
        network,
        alpsToken: {
          address: contracts.AlpsToken.address,
          startBlock: contracts.AlpsToken.instance.deployTransaction.blockNumber,
        },
        alpsAuctionHouse: {
          address: contracts.AlpsAuctionHouseProxy.address,
          startBlock: contracts.AlpsAuctionHouseProxy.instance.deployTransaction.blockNumber,
        },
        alpsDAO: {
          address: contracts.AlpsDAOProxyV2.address,
          startBlock: contracts.AlpsDAOProxyV2.instance.deployTransaction.blockNumber,
        },
      };
      writeFileSync(subgraphConfigPath, JSON.stringify(subgraphConfig, null, 2));
      console.log('Subgraph config has been generated.');
    },
  );
