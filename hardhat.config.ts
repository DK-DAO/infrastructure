import { HardhatUserConfig } from 'hardhat/types';
import fs from 'fs';
import { parse } from 'dotenv';
import 'hardhat-typechain';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import './tasks/deploy';

const compilers = ['0.8.6'].map((item: string) => ({
  version: item,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
}));

const env: any = fs.existsSync(`${__dirname}/.env`)
  ? parse(fs.readFileSync(`${__dirname}/.env`))
  : {
      DUELIST_KING_MNEMONIC: 'baby nose young alone sport inside grain rather undo donor void exotic',
    };

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',

  networks: {
    local: {
      url: 'http://127.0.0.1:8545/',
      chainId: 911,
      accounts: {
        mnemonic: env.DUELIST_KING_MNEMONIC.trim(),
        path: "m/44'/60'/0'/0",
      },
    },
    // Hard hat network
    hardhat: {
      chainId: 911,
      hardfork: 'berlin',
      // forking: {
      //  url: 'https://bsc-dataseed.binance.org/',
      // },
      accounts: {
        mnemonic: env.DUELIST_KING_MNEMONIC.trim(),
        path: "m/44'/60'/0'/0",
      },
      mining: {
        // This is cause of unexpected issue
        interval: 1000,
      },
    },
  },
  solidity: {
    compilers,
  },
};

export default config;
