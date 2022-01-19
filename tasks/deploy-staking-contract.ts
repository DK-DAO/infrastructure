/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { registryRecords } from '../test/helpers/const';
import Deployer from '../test/helpers/deployer';
import { DuelistKingStaking, Registry } from '../typechain';

task('deploy:staking', 'Deploy staking token earn FNT contract')
  .addParam('registry', 'Registry address')
  .addParam('operator', 'Operator address address')
  .setAction(async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const registry = (_taskArgs.registry || '').trim();
    const operator = (_taskArgs.operator || '').trim();
    if (hre.ethers.utils.isAddress(registry) && hre.ethers.utils.isAddress(operator)) {
      const accounts = await hre.ethers.getSigners();
      const deployer: Deployer = Deployer.getInstance(hre);
      const registryContract = <Registry>(
        (await deployer.contractAttach('Infrastructure/Registry', registry)).connect(accounts[0])
      );
      // We assume that accounts[0] is infrastructure operator
      deployer.connect(accounts[0]);
      <DuelistKingStaking>(
        await deployer.contractDeploy(
          'DuelistKing/DuelistKingStaking',
          [],
          registry,
          registryRecords.domain.duelistKing,
        )
      );
      await (
        await registryContract.set(registryRecords.domain.duelistKing, registryRecords.name.stakingOperator, operator)
      ).wait();
      deployer.printReport();
      console.log(
        'Operator is:',
        await registryContract.getAddress(registryRecords.domain.duelistKing, registryRecords.name.stakingOperator),
      );
      return;
    }
    throw new Error('Invalid registry or operator address');
  });

export default {};
