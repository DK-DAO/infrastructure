/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

task('print:accounts', 'Deploy token and vesting contract').setAction(
  async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const accounts = await hre.ethers.getSigners();
    for (let i = 0; i < 5; i += 1) {
      const account = accounts[i];
      console.log(
        `${account.address}\t${(await account.getBalance()).div(10n ** 14n).toNumber() / 10000} ${
          hre.network.name === 'binance' ? 'BNB' : 'ETH'
        }`,
      );
    }
  },
);

export default {};
