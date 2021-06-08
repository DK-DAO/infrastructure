import { HardhatUserConfig } from 'hardhat/types';
import 'hardhat-typechain';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

const compilers = ['0.8.4'].map((item: string) => ({
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
    // Do forking mainnet to test
    hardhat: {
      blockGasLimit: 62500000,
      gas: 3000000,
      gasPrice: 2000000000,
      hardfork: 'berlin',
      // forking: {
      //  url: 'https://bsc-dataseed.binance.org/',
      // },
      accounts: {
        path: "m/44'/60'/0'/0",
      },
    },
  },
  solidity: {
    compilers,
  },
};

export default config;
