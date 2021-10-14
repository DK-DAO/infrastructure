/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import Deployer from '../test/helpers/deployer';
import { VestingCreator, DuelistKingToken } from '../typechain';

task('deploy:token', 'Deploy token and vesting contract').setAction(
  async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const accounts = await hre.ethers.getSigners();
    const deployer: Deployer = Deployer.getInstance(hre);
    deployer.connect(accounts[0]);
    const vestingCreator = <VestingCreator>await deployer.contractDeploy('Operator/VestingCreator', []);
    const dkToken = <DuelistKingToken>(
      await deployer.contractDeploy('Duelist King/DuelistKingToken', [], vestingCreator.address)
    );
    await (await vestingCreator.setToken(dkToken.address)).wait();
    deployer.printReport();
  },
);

export default {};
