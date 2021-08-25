import { HardhatUserConfig } from 'hardhat/types';
import fs from 'fs';
import { parse } from 'dotenv';
import 'hardhat-typechain';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import './tasks/deploy';
import './tasks/create-campaign';
import './tasks/change-nft';
import './tasks/live-test-contract';

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
      DUELIST_KING_POLYGON_RPC: '',
      DUELIST_KING_POLYGON_MNEMONIC: '',
      DUELIST_KING_MAINNET_RPC: '',
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
    hardhat: {
      chainId: 1,
      hardfork: 'london',
      accounts: {
        mnemonic: env.DUELIST_KING_LOCAL_MNEMONIC,
        path: "m/44'/60'/0'/0",
      },
      forking: {
        url: env.DUELIST_KING_MAINNET_RPC,
        enabled: true,
      },
    },
  },
  solidity: {
    compilers,
  },
};

export default config;
