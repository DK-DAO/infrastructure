import { Signer, Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { stringToBytes32, zeroAddress } from './const';
import { Singleton } from './singleton';

export class Deployer {
  private _hre: HardhatRuntimeEnvironment;

  private _libraries: { [key: string]: string } = {};

  private _signer: Signer;

  private _contractCache: { [contractName: string]: Contract } = {};

  private _executed: boolean = false;

  constructor(hre: HardhatRuntimeEnvironment) {
    this._hre = hre;
    this._signer = new this._hre.ethers.VoidSigner(zeroAddress);
  }

  public lock() {
    this._executed = false;
  }

  public unlock() {
    this._executed = true;
  }

  public getDeployerSigner(): Signer {
    return this._signer;
  }

  public async safeExecute(callback: () => Promise<void>) {
    if (this._executed) return;
    if (typeof callback === 'function' && callback.constructor.name === 'AsyncFunction') {
      await callback();
      this._executed = true;
      return;
    }
    throw new Error('Invalid callback');
  }

  public connect(signer: Signer): Deployer {
    this._signer = signer;
    return this;
  }

  public async contractDeploy(contractPath: string, librariesLink: string[], ...params: any[]): Promise<Contract> {
    const [domain, contractName] = contractPath.split('/');
    const entries = Object.entries(this._libraries);
    const linking = Object.fromEntries(entries.filter(([v, _k]: [string, string]) => librariesLink.includes(v)));
    if (typeof this._contractCache[contractPath] === 'undefined') {
      try {
        const instanceFactory = await this._hre.ethers.getContractFactory(contractName, {
          signer: this._signer,
          libraries: linking,
        });
        this._contractCache[contractPath] = await instanceFactory.deploy(...params);
        if (/^libraries$/i.test(domain)) {
          this._libraries[contractName] = this._contractCache[contractPath].address;
        }
      } catch (error: any) {
        throw new Error(`Failed to deploy contract ${contractPath} issue < ${error.message} >\n${error.stack}`);
      }
    }
    return this._contractCache[contractPath];
  }

  public getDeployedContract<T>(contractPath: string): T {
    return <any>this._contractCache[contractPath];
  }

  public getDomainDetail(contractPath: string) {
    const [domain, contractName] = contractPath.split('/');
    return {
      domain,
      contractName,
      b32Domain: stringToBytes32(domain),
      b32ContractName: stringToBytes32(contractName),
      address: this._contractCache[contractPath].address,
    };
  }

  public static getInstance(hre: HardhatRuntimeEnvironment): Deployer {
    return Singleton('infrastructure', Deployer, hre);
  }
}

export default Deployer;
