/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { ethers } from 'ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import initInfrastructure, { IConfiguration } from '../test/helpers/deployer-infrastructure';
import initDuelistKing from '../test/helpers/deployer-duelist-king';

import { env } from '../env';
import { TestToken } from '../typechain';

function getWallet(mnemonic: string, index: number): ethers.Wallet {
  return ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`);
}

async function getConfig(hre: HardhatRuntimeEnvironment): Promise<IConfiguration> {
  const accounts = await hre.ethers.getSigners();
  if (hre.network.name === 'fantom') {
    return {
      network: hre.network.name,
      salesAgent: accounts[9],
      infrastructure: {
        operator: getWallet(env.DUELIST_KING_DEPLOY_MNEMONIC, 0).connect(hre.ethers.provider),
        oracles: [accounts[0]],
      },
      duelistKing: {
        operator: getWallet(env.DUELIST_KING_DEPLOY_MNEMONIC, 1).connect(hre.ethers.provider),
        oracles: [accounts[1]],
      },
    };
  }
  return {
    network: hre.network.name,
    salesAgent: accounts[9],
    infrastructure: {
      operator: accounts[0],
      oracles: [accounts[1]],
    },
    duelistKing: {
      operator: accounts[2],
      oracles: [accounts[3]],
    },
  };
}

task('deploy', 'Deploy all smart contracts')
  // .addParam('account', "The account's address")
  .setAction(async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const {
      deployer,
      config: {
        infrastructure: { operator, operatorAddress, oracleAddresses },
        duelistKing,
      },
    } = await initDuelistKing(await initInfrastructure(hre, await getConfig(hre)));

    if (hre.network.name === 'local') {
      const accounts = await hre.ethers.getSigners();
      const contractTestToken = <TestToken>await deployer.connect(operator).contractDeploy('Test/TestToken', []);
      await contractTestToken.connect(operator).transfer(accounts[5].address, '500000000000000000000');
      await contractTestToken.connect(operator).transfer(accounts[5].address, '10000000000000000000');
      await contractTestToken.connect(operator).transfer(accounts[5].address, '5000000000000000000');
      console.log('Watching address:         ', accounts[5].address);
    }
    deployer.printReport();
    console.log('Infrastructure Operator:  ', operatorAddress);
    console.log('Infrastructure Oracles:   ', oracleAddresses.join(','));
    console.log('Duelist King Operator:    ', duelistKing.operatorAddress);
    console.log('Duelist King Oracles:     ', duelistKing.oracleAddresses.join(','));
  });

export default {};
