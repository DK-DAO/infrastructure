import { Signer, Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Registry } from '../../typechain';
import { stringToBytes32, zeroAddress } from './const';
import { printAllEvents } from './functions';
import { Singleton } from './singleton';

export class Deployer {
  private _hre: HardhatRuntimeEnvironment;

  private _libraries: { [key: string]: string } = {};

  private _signer: Signer;

  private _contractCache: { [contractPath: string]: Contract } = {};

  private _executed: boolean = false;

  constructor(hre: HardhatRuntimeEnvironment) {
    this._hre = hre;
    this._signer = new this._hre.ethers.VoidSigner(zeroAddress);
  }

  public getChainId() {
    return this._hre.network.config.chainId || 0;
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

  public async safeExecute<T>(callback: () => Promise<T>) {
    if (this._executed) return;
    if (typeof callback === 'function' && callback.constructor.name === 'AsyncFunction') {
      const result = await callback();
      this._executed = true;
      return result;
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

  public async contractAttach(contractPath: string, contractAddress: string): Promise<Contract> {
    const [, contractName] = contractPath.split('/');
    const instanceFactory = await this._hre.ethers.getContractFactory(contractName, {
      signer: this._signer,
    });
    return instanceFactory.attach(contractAddress);
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

  public async getAddressInRegistry(domain: string, name: string): Promise<string> {
    const registry = this.getDeployedContract<Registry>('Infrastructure/Registry');
    return registry.getAddress(stringToBytes32(domain), stringToBytes32(name));
  }

  public async deployTheDivine(): Promise<Contract> {
    const txResult = await (
      await this._signer.sendTransaction({
        data: '0x601a803d90600a8239f360203d333218600a57fd5b8181805482430340188152208155f3',
      })
    ).wait();
    this._contractCache['Chiro/TheDivine'] = await this._hre.ethers.getContractAt(
      'ITheDivine',
      txResult.contractAddress,
    );
    return this._contractCache['Chiro/TheDivine'];
  }

  public static getInstance(hre: HardhatRuntimeEnvironment): Deployer {
    return Singleton('infrastructure', Deployer, hre);
  }

  public printReport() {
    let entries = Object.entries(this._contractCache);
    console.log(
      `[Report for network: ${this._hre.network.name}] --------------------------------------------------------`,
    );
    for (let i = 0; i < entries.length; i += 1) {
      const [k, v] = entries[i];
      console.log(`\t${k}:${''.padEnd(48 - k.length, ' ')}${v.address}`);
    }
    console.log(
      `[End of Report for network: ${this._hre.network.name}] -------------------------------------------------`,
    );
  }
}

export default Deployer;
