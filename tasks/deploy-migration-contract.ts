/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import Deployer from '../test/helpers/deployer';

task('deploy:migration', 'Deploy migration contract').setAction(
  async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const accounts = await hre.ethers.getSigners();
    const deployer: Deployer = Deployer.getInstance(hre);
    // We assume that accounts[0] is infrastructure operator
    deployer.connect(accounts[0]);
    await deployer.contractDeploy(
      'Duelist King/DuelistKingMigration',
      [],
      '0xE1f03feAFB6107E82191CdB46f270c2ce962eC4e',
      '0x8BD47c687d0D3299a71f2f9Cd9D216C2Df1271d3',
    );
    deployer.printReport();
  },
);

export default {};
