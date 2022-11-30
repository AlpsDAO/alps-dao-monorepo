import { task, types } from 'hardhat/config';

task('unpause', 'Unpause auction')
  .addOptionalParam(
    'auctionHouseProxy',
    'The `auctionHouseProxy` contract address',
    '0x04f83161B21a5B6DE987b5056d48F72DdB8deC8f',
    types.string,
  )
  .setAction(async ({ auctionHouseProxy }, { ethers }) => {
    const auctionHouseFactory = await ethers.getContractFactory('AlpsAuctionHouse');
    const auctionHouseContract = auctionHouseFactory.attach(auctionHouseProxy);

    // await (
    //   await auctionHouseContract.reservePrice(),
    //   )
    // ).wait();

    console.log(await auctionHouseContract.reservePrice());
  });
