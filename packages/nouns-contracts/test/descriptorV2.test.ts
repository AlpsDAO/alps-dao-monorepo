import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import { AlpsAttribute, AlpsDescriptorV2 } from '../typechain';
import ImageData from '../files/image-data-v2.json';
import { LongestPart } from './types';
import {
  deployAlpsDescriptorV2,
  populateDescriptorV2,
  populateAttribute,
  parseTraitName,
} from './utils';
import { ethers } from 'hardhat';
import { appendFileSync } from 'fs';
import ImageDataV2 from '../files/image-data-v2.json';

chai.use(solidity);
const { expect } = chai;

describe.only('AlpsDescriptorV2', () => {
  let alpsDescriptor: AlpsDescriptorV2;
  let alpsAttribute: AlpsAttribute;
  let snapshotId: number;

  const part: LongestPart = {
    length: 0,
    index: 0,
  };
  const longest: Record<string, LongestPart> = {
    bodies: part,
    accessories: part,
    heads: part,
    glasses: part,
  };

  before(async () => {
    const { descriptor, attribute } = await deployAlpsDescriptorV2();
    alpsDescriptor = descriptor;
    alpsAttribute = attribute;

    await populateAttribute(alpsAttribute);

    for (const [l, layer] of Object.entries(ImageData.images)) {
      for (const [i, item] of layer.entries()) {
        if (item.data.length > longest[l].length) {
          longest[l] = {
            length: item.data.length,
            index: i,
          };
        }
      }
    }

    await populateDescriptorV2(alpsDescriptor);
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot', []);
  });

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId]);
  });

  it('should generate valid attributes', async () => {
    const { images } = ImageDataV2;
    const { bodies, accessories, heads, glasses } = images;

    expect(await alpsAttribute.backgrounds(0)).to.eq('Bluebird Sky');
    expect(await alpsAttribute.bodies(0)).to.eq(parseTraitName(bodies[0].filename));
    expect(await alpsAttribute.bodies(bodies.length - 1)).to.eq(
      parseTraitName(bodies[bodies.length - 1].filename),
    );
    expect(await alpsAttribute.accessories(0)).to.eq(parseTraitName(accessories[0].filename));
    expect(await alpsAttribute.accessories(accessories.length - 1)).to.eq(
      parseTraitName(accessories[accessories.length - 1].filename),
    );
    expect(await alpsAttribute.heads(0)).to.eq(parseTraitName(heads[0].filename));
    expect(await alpsAttribute.heads(heads.length - 1)).to.eq(
      parseTraitName(heads[heads.length - 1].filename),
    );
    expect(await alpsAttribute.glasses(5)).to.eq(parseTraitName(glasses[5].filename));
    expect(await alpsAttribute.glasses(glasses.length - 1)).to.eq(
      parseTraitName(glasses[glasses.length - 1].filename),
    );

    const tokenUri = await alpsDescriptor.tokenURI(
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

    const { attributes } = JSON.parse(
      Buffer.from(tokenUri.replace('data:application/json;base64,', ''), 'base64').toString(
        'ascii',
      ),
    );

    // background
    expect(attributes[0].value).to.eq('Bluebird Sky');

    // body
    expect(attributes[1].value).to.eq(parseTraitName(bodies[0].filename));

    // accessory
    expect(attributes[2].value).to.eq(parseTraitName(accessories[0].filename));

    // head
    expect(attributes[3].value).to.eq(parseTraitName(heads[0].filename));

    // glasses
    expect(attributes[4].value).to.eq(parseTraitName(glasses[0].filename));

    // console.log(
    //   await alpsDescriptor.tokenURI(
    //     0,
    //     {
    //       background: 0,
    //       body: 0,
    //       accessory: 0,
    //       head: 0,
    //       glasses: 0,
    //     },
    //     { gasLimit: 500_000_000 },
    //   ),
    // );
  }).timeout(6000000);

  // Unskip this test to validate the encoding of all parts. It ensures that no parts revert when building the token URI.
  // This test also outputs a parts.html file, which can be visually inspected.
  // Note that this test takes a long time to run. You must increase the mocha timeout to a large number.
  it.skip('should generate valid token uri metadata for all supported parts when data uris are enabled', async () => {
    console.log('Running... this may take a little while...');

    const { bgcolors, images } = ImageData;
    const { bodies, accessories, heads, glasses } = images;
    const max = Math.max(bodies.length, accessories.length, heads.length, glasses.length);
    for (let i = 0; i < max; i++) {
      const tokenUri = await alpsDescriptor.tokenURI(i, {
        background: Math.min(i, bgcolors.length - 1),
        body: Math.min(i, bodies.length - 1),
        accessory: Math.min(i, accessories.length - 1),
        head: Math.min(i, heads.length - 1),
        glasses: Math.min(i, glasses.length - 1),
      });
      const { name, description, image } = JSON.parse(
        Buffer.from(tokenUri.replace('data:application/json;base64,', ''), 'base64').toString(
          'ascii',
        ),
      );
      expect(name).to.equal(`Alp ${i}`);
      expect(description).to.equal(`Alp ${i} is a member of the Alps DAO`);
      expect(image).to.not.be.undefined;

      appendFileSync(
        'parts.html',
        Buffer.from(image.split(';base64,').pop(), 'base64').toString('ascii'),
      );

      if (i && i % Math.round(max / 10) === 0) {
        console.log(`${Math.round((i / max) * 100)}% complete`);
      }
    }
  });
});
