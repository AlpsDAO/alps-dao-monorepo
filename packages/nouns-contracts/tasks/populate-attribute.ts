import { task, types } from 'hardhat/config';
import ImageData from '../files/image-data-v2.json';
import { parseTraitName } from './utils';

task('populate-attribute', 'Populates the attribute.')
  .addOptionalParam(
    'alpsAttribute',
    'The `AlpsAttribute` contract address',
    '0x349DE69a13623e2C2C9015CC6659eb7e7763E756',
    types.string,
  )
  .setAction(async ({ alpsAttribute }, { ethers, network }) => {
    const options = { gasLimit: network.name === 'hardhat' ? 30000000 : undefined };

    const attributeFactory = await ethers.getContractFactory('AlpsAttribute');
    const attributeContract = attributeFactory.attach(alpsAttribute);

    const { images } = ImageData;
    const { bodies, accessories, heads, glasses } = images;

    const bodyAttributes = bodies.map(({ filename }) => parseTraitName(filename));
    const accessoryAttributes = accessories.map(({ filename }) => parseTraitName(filename));
    const headAttributes = heads.map(({ filename }) => parseTraitName(filename));
    const glassesAttributes = glasses.map(({ filename }) => parseTraitName(filename));

    await attributeContract.addManyBackgrounds([
      'Bluebird Sky',
      'Evergreen',
      'Night',
      'Slate',
      'Yellow Snow',
      'Cool',
      'Warm',
    ]);

    await attributeContract.addManyBodies(bodyAttributes, options);
    await attributeContract.addManyAccessories(accessoryAttributes, options);
    await attributeContract.addManyHeads(headAttributes, options);
    await attributeContract.addManyGlasses(glassesAttributes, options);

    console.log('Attribute populated.');
  });