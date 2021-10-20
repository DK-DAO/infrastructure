/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import Deployer from '../test/helpers/deployer';
import { DuelistKingToken } from '../typechain';

task('deploy:token', 'Deploy token and vesting contract').setAction(
  async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const accounts = await hre.ethers.getSigners();
    console.log('Genesis:', accounts[0].address);
    const deployer: Deployer = Deployer.getInstance(hre);
    deployer.connect(accounts[0]);
    // const vestingCreator = <VestingCreator>await deployer.contractDeploy('Operator/VestingCreator', []);
    const dkToken = <DuelistKingToken>(
      await deployer.contractDeploy('Duelist King/DuelistKingToken', [], accounts[0].address)
    );
    // await (await vestingCreator.setToken(dkToken.address)).wait();
    deployer.printReport();
    console.log('Balance of genesis:', (await dkToken.balanceOf(accounts[0].address)).div(10n ** 18n).toNumber());
    console.log('Name:', await dkToken.name());
    console.log('Symbol:', await dkToken.symbol());
    console.log('Decimal:', await dkToken.decimals());
    console.log('Total Supply:', (await dkToken.totalSupply()).div(10n ** 18n).toNumber());
  },
);

export default {};
