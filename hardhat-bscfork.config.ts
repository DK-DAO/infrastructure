import { HardhatUserConfig } from 'hardhat/types';
import 'hardhat-typechain';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import { env } from './env';
import './tasks/live-test-contract';
import './tasks/live-test-time-lock';

const compilers = ['0.8.6'].map((item: string) => ({
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
    local: {
      url: 'http://127.0.0.1:8545',
      chainId: 56,
      accounts: {
        mnemonic: env.DUELIST_KING_LOCAL_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
    },
    hardhat: {
      chainId: 56,
      hardfork: 'london',
      accounts: {
        mnemonic: env.DUELIST_KING_LOCAL_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
      forking: {
        url: env.DUELIST_KING_BINANCE_RPC,
        enabled: true,
      },
    },
  },
  solidity: {
    compilers,
  },
};

export default config;
