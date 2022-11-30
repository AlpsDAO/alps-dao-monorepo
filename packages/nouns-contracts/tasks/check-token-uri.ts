import { task, types } from 'hardhat/config';

task('check-token-uri', 'Populates the attribute.')
  .addOptionalParam(
    'alpsDescriptor',
    'The `AlpsDescriptorV2` contract address',
    '0xf0fEBE9B07f19757E9540a36eCD63052bdBf6819',
    types.string,
  )
  .addOptionalParam(
    'nftDescriptor',
    'The `nftDescriptorV2` contract address',
    '0xCbcE9fae3a53E541C1AaAa29E1e6b41282DdAbbB',
    types.string,
  )
  .setAction(async ({ alpsDescriptor, nftDescriptor }, { ethers }) => {
    const descriptorFactory = await ethers.getContractFactory('AlpsDescriptorV2', {
      libraries: { NFTDescriptorV2: nftDescriptor },
    });
    const descriptorContract = descriptorFactory.attach(alpsDescriptor);

    const tokenUri = await descriptorContract.tokenURI(
      0,
      {
        background: 0,
        body: 0,
        accessory: 0,
        head: 0,
        glasses: 0,
      },
      { gasLimit: 500_000_000 },
    );

    const metaData = JSON.parse(
      Buffer.from(tokenUri.replace('data:application/json;base64,', ''), 'base64').toString(
        'ascii',
      ),
    );

    console.log(JSON.stringify(metaData));
  });
