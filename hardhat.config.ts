/* eslint-disable global-require */
import { HardhatUserConfig } from 'hardhat/types';
import { env } from './env';
import 'hardhat-typechain';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

if (env.DUELIST_KING_LOCAL_MNEMONIC !== 'baby nose young alone sport inside grain rather undo donor void exotic') {
  require('./tasks/deploy');
  require('./tasks/deploy-token');
}

const compilers = ['0.8.9'].map((item: string) => ({
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
      url: env.DUELIST_KING_FANTOM_RPC,
      chainId: 137,
      accounts: {
        mnemonic: env.DUELIST_KING_FANTOM_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
    },
    binace: {
      url: env.DUELIST_KING_BINANCE_RPC,
      chainId: 56,
      accounts: {
        mnemonic: env.DUELIST_KING_BINANCE_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
    },
    rinkeby: {
      url: env.DUELIST_KING_RINKEBY_RPC,
      chainId: 4,
      accounts: {
        mnemonic: env.DUELIST_KING_RINKEBY_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
    },
    local: {
      url: env.DUELIST_KING_LOCAL_RPC,
      chainId: 911,
      accounts: {
        mnemonic: env.DUELIST_KING_LOCAL_MNEMONIC,
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
        mnemonic: env.DUELIST_KING_LOCAL_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
    },
  },
  solidity: {
    compilers,
  },
};

export default config;
