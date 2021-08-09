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
      DUELIST_KING_LOCAL_MNEMONIC: 'baby nose young alone sport inside grain rather undo donor void exotic',
      DUELIST_KING_LOCAL_RPC: 'http://localhost:8545',
      DUELIST_KING_RINKEBY_MNEMONIC: '',
      DUELIST_KING_RINKEBY_RPC: '',
      DUELIST_KING_DEPLOY_MNEMONIC: '',
    };

const entries = Object.entries(env);

for (let i = 0; i < entries.length; i += 1) {
  const [k, v] = <[string, string]>entries[i];
  env[k] = v.trim();
  process.env[k] = v;
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
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
      hardfork: 'berlin',
      accounts: {
        mnemonic: env.DUELIST_KING_LOCAL_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
      mining: {
        // This is cause of unexpected issue
        // interval: 1000,
      },
    },
  },
  solidity: {
    compilers,
  },
};

export default config;
