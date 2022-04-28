/* eslint-disable global-require */
import { HardhatUserConfig } from 'hardhat/types';
import { env } from './env';
import 'hardhat-typechain';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

if (env.DUELIST_KING_DEPLOY_MNEMONIC !== 'baby nose young alone sport inside grain rather undo donor void exotic') {
  require('./tasks/deploy-migration-contract');
  require('./tasks/print-account');
  require('./tasks/deploy');
  require('./tasks/deploy-token');
  require('./tasks/deploy-timelock');
  require('./tasks/deploy-staking-contract');
  require('./tasks/deploy-vesting-creator');
  require('./tasks/create-vesting-contract');
  require('./tasks/transfer-token');
  require('./tasks/transfer-native-token');
  require('./tasks/open-boxes');
}

const compilers = ['0.8.7'].map((item: string) => ({
  version: item,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
}));

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    fantom: {
      url: env.DUELIST_KING_RPC,
      chainId: 250,
      accounts: {
        mnemonic: env.DUELIST_KING_DEPLOY_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
    },
    binance: {
      url: env.DUELIST_KING_RPC,
      chainId: 56,
      accounts: {
        mnemonic: env.DUELIST_KING_DEPLOY_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
    },
    testnet: {
      url: env.DUELIST_KING_RPC,
      // Fantom testnet
      chainId: 0xfa2,
      accounts: {
        mnemonic: env.DUELIST_KING_DEPLOY_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
    },
    local: {
      url: env.DUELIST_KING_RPC,
      chainId: 911,
      accounts: {
        mnemonic: env.DUELIST_KING_DEPLOY_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
    },
    // Hard hat network
    hardhat: {
      chainId: 911,
      hardfork: 'london',
      blockGasLimit: 30000000,
      initialBaseFeePerGas: 0,
      gas: 25000000,
      accounts: {
        mnemonic: env.DUELIST_KING_DEPLOY_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
    },
  },
  solidity: {
    compilers,
  },
};

export default config;
