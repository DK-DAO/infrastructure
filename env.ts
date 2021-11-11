import fs from 'fs';
import { parse } from 'dotenv';

export interface IEnvironment {
  // Local network
  DUELIST_KING_LOCAL_MNEMONIC: string;
  DUELIST_KING_LOCAL_RPC: string;
  // Testnet network
  DUELIST_KING_TESTNET_MNEMONIC: string;
  DUELIST_KING_TESTNET_RPC: string;
  // Binance
  DUELIST_KING_BINANCE_MNEMONIC: string;
  DUELIST_KING_BINANCE_RPC: string;
  // Fantom network
  DUELIST_KING_FANTOM_MNEMONIC: string;
  DUELIST_KING_FANTOM_RPC: string;
  // Deploy mnemonic
  DUELIST_KING_DEPLOY_MNEMONIC: string;
}

function clean(config: any): any {
  const entries = Object.entries(config);
  const cleaned: any = {};
  for (let i = 0; i < entries.length; i += 1) {
    const [k, v] = entries[i] as [string, string];
    cleaned[k] = v.trim();
  }
  return cleaned;
}

export const env: IEnvironment = fs.existsSync(`${__dirname}/.env`)
  ? clean(parse(fs.readFileSync(`${__dirname}/.env`)) as any)
  : {
      DUELIST_KING_LOCAL_MNEMONIC: 'baby nose young alone sport inside grain rather undo donor void exotic',
      DUELIST_KING_LOCAL_RPC: 'http://localhost:8545',
      DUELIST_KING_TESTNET_MNEMONIC: '',
      DUELIST_KING_TESTNET_RPC: '',
      DUELIST_KING_BINANCE_MNEMONIC: '',
      DUELIST_KING_BINANCE_RPC: '',
      DUELIST_KING_FANTOM_MNEMONIC: '',
      DUELIST_KING_FANTOM_RPC: '',
      DUELIST_KING_DEPLOY_MNEMONIC: '',
    };
