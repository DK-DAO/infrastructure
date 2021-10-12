import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import crypto, { randomBytes } from 'crypto';
import { keccak256 } from 'js-sha3';
import hre from 'hardhat';
import { BigNumber, ContractTransaction, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { OracleProxy } from '../../typechain';
import BytesBuffer from './bytes';

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

export function bigNumberToBytes32(b: BigNumber): Buffer {
  return Buffer.from(`${b.toHexString().replace(/^0x/i, '').padStart(64, '0')}`, 'hex');
}

export function getUint128Random(): string {
  return `0x${randomBytes(16).toString('hex')}`;
}

export async function contractDeploy(actor: Signer, contractPath: string, ...params: any[]): Promise<Contract> {
  const contractParts = contractPath.split('/');
  let contractName = contractParts.length === 2 ? contractParts[1] : contractParts[0];
  if (typeof contractCache[contractPath] === 'undefined') {
    const instanceFactory = await hre.ethers.getContractFactory(contractName);
    contractCache[contractPath] = await instanceFactory.connect(actor).deploy(...params);
  }

  return contractCache[contractPath];
}

export function timestamp() {
  return Math.round(Date.now());
}

export function buildDigest(): { s: Buffer; h: Buffer } {
  const buf = crypto.randomBytes(32);
  // Write time stamp to last 8 bytes it's implementation of S || t
  buf.writeBigInt64BE(BigInt(timestamp()), 24);

  return {
    s: buf,
    h: Buffer.from(keccak256.create().update(buf).digest()),
  };
}

export function buildDigestArray(size: number) {
  const h = [];
  const s = [];
  const buf = crypto.randomBytes(size * 32);
  for (let i = 0; i < size; i += 1) {
    const j = i * 32;
    buf.writeBigInt64BE(BigInt(timestamp()), j + 24);
    const t = Buffer.alloc(32);
    buf.copy(t, 0, j, j + 32);
    const d = Buffer.from(keccak256.create().update(t).digest());
    s.push(t);
    h.push(d);
    d.copy(buf, j);
  }
  return {
    h,
    s,
    v: buf,
  };
}

export function randInt(start: number, end: number) {
  return start + ((Math.random() * (end - start)) >>> 0);
}

export async function getGasCost(tx: ContractTransaction) {
  console.log('\tGas cost:', (await tx.wait()).gasUsed.toString());
}

export async function contractAt(name: string, at: string) {
  const factory = await hre.ethers.getContractFactory(name);
  return factory.attach(at);
}

function rTrim(value: string, trim: string): string {
  if (value.length === 0) return value;
  let count = 0;
  for (let i = value.length - 1; i >= 0 && value[i] === trim; i -= 1) {
    count += 1;
  }
  return value.substr(0, value.length - count);
}

function argumentTransform(eventName: string, arg: string) {
  if (eventName === 'RecordSet' && arg.length === 66) {
    let hexString = rTrim(arg.replace(/0x/gi, ''), '0');
    hexString = hexString.length % 2 === 0 ? hexString : `${hexString}0`;
    return Buffer.from(hexString, 'hex').toString();
  }
  return arg;
}

export async function printAllEvents(tx: ContractTransaction) {
  const result = await tx.wait();
  console.log(
    result.events
      ?.map((e) => `\t${e.event}(${e.args?.map((i) => argumentTransform(e.event || '', i)).join(', ')})`)
      .join('\n'),
  );
}

export async function craftProof(oracleSigner: SignerWithAddress, oracle: OracleProxy): Promise<Buffer> {
  let message = bigNumberToBytes32(await oracle.getValidTimeNonce(60000, getUint128Random()));
  // Make sure that it matched
  let signedProof = await oracleSigner.signMessage(utils.arrayify(message));
  return BytesBuffer.newInstance().writeBytes(signedProof).writeBytes(message).invoke();
}
