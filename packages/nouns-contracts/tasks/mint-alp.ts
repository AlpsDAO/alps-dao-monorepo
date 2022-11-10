import { Result } from 'ethers/lib/utils';
import { task, types } from 'hardhat/config';

task('mint-alp', 'Mints a Alp')
  .addOptionalParam(
    'alpsToken',
    'The `AlpsToken` contract address',
    '0x7c6D406deA017E22158c07EC0031E69E95e7d7F5',
    types.string,
  )
  .setAction(async ({ alpsToken }, { ethers }) => {
    const nftFactory = await ethers.getContractFactory('AlpsToken');
    const nftContract = nftFactory.attach(alpsToken);

    const receipt = await (await nftContract.mint()).wait();
    const alpCreated = receipt.events?.[1];
    const { tokenId } = alpCreated?.args as Result;

    console.log(`Alp minted with ID: ${tokenId.toString()}.`);
  });
