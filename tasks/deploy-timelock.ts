/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import Deployer from '../test/helpers/deployer';
import { TimeLock } from '../typechain';

task('deploy:timelock', 'Deploy time lock contract').setAction(
  async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const accounts = await hre.ethers.getSigners();
    const deployer: Deployer = Deployer.getInstance(hre);
    deployer.connect(accounts[0]);
    // const vestingCreator = <VestingCreator>await deployer.contractDeploy('Operator/VestingCreator', []);
    <TimeLock>(
      await deployer.contractDeploy(
        'Operation/TimeLock',
        [],
        '0xB225172Bd7F20990C6C5be3EEce435C1D197f709',
        '0x7Ceb519718A80Dd78a8545AD8e7f401dE4f2faA7',
        1635328800,
      )
    );
    // await (await vestingCreator.setToken(dkToken.address)).wait();
    deployer.printReport();
  },
);

export default {};
