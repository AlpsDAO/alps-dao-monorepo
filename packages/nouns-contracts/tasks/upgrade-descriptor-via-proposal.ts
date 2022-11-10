import { task } from 'hardhat/config';

task('upgrade-descriptor-via-proposal', 'Upgrade AlpsToken to use Descriptor V2.')
  .addParam('descriptor', 'The `AlpsDescriptorV2` contract address')
  .addParam('dao', 'The `AlpsDAOProxy` contract address')
  .addParam('token', 'The `AlpsToken` contract address')
  .setAction(async ({ descriptor, dao, token }, { ethers }) => {
    const targets = [token as string];
    const values = [0];
    const signatures = ['setDescriptor(address)'];
    const calldatas = [ethers.utils.defaultAbiCoder.encode(['address'], [descriptor])];

    const gov = (await ethers.getContractFactory('AlpsDAOLogicV1')).attach(dao);
    const propTx = await gov.propose(
      targets,
      values,
      signatures,
      calldatas,
      `# Upgrade AlpsToken descriptor to V2\nThis proposal calls a function on AlpsToken to set its descriptor to V2.`,
    );
    await propTx.wait();

    console.log('Proposal submitted!');
  });
