/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import Deployer from '../test/helpers/deployer';
import { VestingCreator } from '../typechain';

task('deploy:vesting', 'Deploy vesting creator contract')
  .addParam('token', 'Token address')
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const accounts = await hre.ethers.getSigners();
    const tokenAddress = (taskArgs.token || '').trim();
    if (hre.ethers.utils.isAddress(tokenAddress)) {
      console.log('Owner:', accounts[0].address);
      console.log('Token Address:', tokenAddress);
      const deployer: Deployer = Deployer.getInstance(hre);
      deployer.connect(accounts[0]);
      const vestingCreator = <VestingCreator>await deployer.contractDeploy('Operator/VestingCreator', []);
      await (await vestingCreator.setToken(tokenAddress)).wait();
      deployer.printReport();
      console.log('Token address:', await vestingCreator.getToken());
      return;
    }
    throw new Error('Invalid token address');
  });

export default {};
