import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import hre from 'hardhat';

interface IKeyValues {
  [key: string]: string;
}

interface ISignerCache {
  [key: string]: Signer;
}

interface IContractCache {
  [key: string]: Contract;
}

const signers: ISignerCache = {};

const signerAlias: IKeyValues = {};

const contractCache: IContractCache = {};

export async function unlockSigner(alias: string): Promise<Signer>;

export async function unlockSigner(alias: string, address: string): Promise<Signer>;

export async function unlockSigner(...params: string[]): Promise<Signer> {
  if (params.length === 1) {
    const [alias] = params;
    if (typeof alias !== 'string') throw new Error('Alias was not a string');
    if (typeof signerAlias[alias] === 'undefined') throw new Error('Alias was not defined');
    if (typeof signers[signerAlias[alias]] === 'undefined') throw new Error('Signer was not unblocked');
    // We will get unlocked signer by alias
    return signers[signerAlias[alias]];
  } else if (params.length === 2) {
    const [alias, address] = params;
    // Prevent case sensitive
    const key = address.toLowerCase();
    if (typeof signers[address] === 'undefined') {
      if (typeof signerAlias[alias] === 'undefined') {
        signerAlias[alias] = key;
      }
      await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [address],
      });
      signers[address] = await hre.ethers.provider.getSigner(address);
    }
    return signers[address];
  }
  throw new Error('Number of parameters was not match');
}

export async function getFirstSigner(): Promise<Signer> {
  const [owner] = await hre.ethers.getSigners();
  return owner;
}

export function stringToBytes32(v: string) {
  const buf = Buffer.alloc(32);
  buf.write(v);
  return `0x${buf.toString('hex')}`;
}

export async function contractDeploy(actor: Signer, contractPath: string, ...params: any[]): Promise<Contract> {
  const contractParts = contractPath.split('/');
  let contractName = contractParts.length === 2 ? contractParts[1] : contractParts[0];
  if (typeof contractCache[contractPath] === 'undefined') {
    const instanceFactory = await hre.ethers.getContractFactory(contractName);
    contractCache[contractPath] = await instanceFactory.connect(actor).deploy(...params);
  }
  console.log(`Deploy ${contractPath} at ${contractCache[contractPath].address}`);
  return contractCache[contractPath];
}
