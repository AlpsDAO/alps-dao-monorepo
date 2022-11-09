import chai from 'chai';
import { ethers } from 'hardhat';
import { BigNumber as EthersBN, constants } from 'ethers';
import { solidity } from 'ethereum-waffle';
import { AlpsDescriptorV2__factory as AlpsDescriptorV2Factory, AlpsToken } from '../typechain';
import { deployAlpsToken, populateDescriptorV2 } from './utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

chai.use(solidity);
const { expect } = chai;

describe('AlpsToken', () => {
  let alpsToken: AlpsToken;
  let deployer: SignerWithAddress;
  let alpersDAO: SignerWithAddress;
  let snapshotId: number;

  before(async () => {
    [deployer, alpersDAO] = await ethers.getSigners();
    alpsToken = await deployAlpsToken(deployer, alpersDAO.address, deployer.address);

    const descriptor = await alpsToken.descriptor();

    await populateDescriptorV2(AlpsDescriptorV2Factory.connect(descriptor, deployer));
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot', []);
  });

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId]);
  });

  it('should allow the minter to mint a alp to itself and a reward alp to the alpersDAO', async () => {
    const receipt = await (await alpsToken.mint()).wait();

    const [, , , alpersAlpCreated, , , , ownersAlpCreated] = receipt.events || [];

    expect(await alpsToken.ownerOf(0)).to.eq(alpersDAO.address);
    expect(alpersAlpCreated?.event).to.eq('AlpCreated');
    expect(alpersAlpCreated?.args?.tokenId).to.eq(0);
    expect(alpersAlpCreated?.args?.seed.length).to.equal(5);

    expect(await alpsToken.ownerOf(1)).to.eq(deployer.address);
    expect(ownersAlpCreated?.event).to.eq('AlpCreated');
    expect(ownersAlpCreated?.args?.tokenId).to.eq(1);
    expect(ownersAlpCreated?.args?.seed.length).to.equal(5);

    alpersAlpCreated?.args?.seed.forEach((item: EthersBN | number) => {
      const value = typeof item !== 'number' ? item?.toNumber() : item;
      expect(value).to.be.a('number');
    });

    ownersAlpCreated?.args?.seed.forEach((item: EthersBN | number) => {
      const value = typeof item !== 'number' ? item?.toNumber() : item;
      expect(value).to.be.a('number');
    });
  });

  it('should set symbol', async () => {
    expect(await alpsToken.symbol()).to.eq('ALPS');
  });

  it('should set name', async () => {
    expect(await alpsToken.name()).to.eq('Alps DAO');
  });

  it('should allow minter to mint a alp to itself', async () => {
    await (await alpsToken.mint()).wait();

    const receipt = await (await alpsToken.mint()).wait();
    const alpCreated = receipt.events?.[3];

    expect(await alpsToken.ownerOf(2)).to.eq(deployer.address);
    expect(alpCreated?.event).to.eq('AlpCreated');
    expect(alpCreated?.args?.tokenId).to.eq(2);
    expect(alpCreated?.args?.seed.length).to.equal(5);

    alpCreated?.args?.seed.forEach((item: EthersBN | number) => {
      const value = typeof item !== 'number' ? item?.toNumber() : item;
      expect(value).to.be.a('number');
    });
  });

  it('should emit two transfer logs on mint', async () => {
    const [, , creator, minter] = await ethers.getSigners();

    await (await alpsToken.mint()).wait();

    await (await alpsToken.setMinter(minter.address)).wait();
    await (await alpsToken.transferOwnership(creator.address)).wait();

    const tx = alpsToken.connect(minter).mint();

    await expect(tx)
      .to.emit(alpsToken, 'Transfer')
      .withArgs(constants.AddressZero, creator.address, 2);
    await expect(tx).to.emit(alpsToken, 'Transfer').withArgs(creator.address, minter.address, 2);
  });

  it('should allow minter to burn a alp', async () => {
    await (await alpsToken.mint()).wait();

    const tx = alpsToken.burn(0);
    await expect(tx).to.emit(alpsToken, 'AlpBurned').withArgs(0);
  });

  it('should revert on non-minter mint', async () => {
    const account0AsAlpErc721Account = alpsToken.connect(alpersDAO);
    await expect(account0AsAlpErc721Account.mint()).to.be.reverted;
  });

  describe('contractURI', async () => {
    it('should return correct contractURI', async () => {
      expect(await alpsToken.contractURI()).to.eq(
        'ipfs://QmZi1n79FqWt2tTLwCqiy6nLM6xLGRsEPQ5JmReJQKNNzX',
      );
    });
    it('should allow owner to set contractURI', async () => {
      await alpsToken.setContractURIHash('ABC123');
      expect(await alpsToken.contractURI()).to.eq('ipfs://ABC123');
    });
    it('should not allow non owner to set contractURI', async () => {
      const [, nonOwner] = await ethers.getSigners();
      await expect(alpsToken.connect(nonOwner).setContractURIHash('BAD')).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });
});
