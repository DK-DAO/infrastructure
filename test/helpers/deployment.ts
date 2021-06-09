import hre from 'hardhat';
import { expect } from 'chai';
import { Signer } from 'ethers';
import { contractDeploy } from '../helpers/functions';
import { registryRecords } from '../helpers/const';
import { NFT, OracleProxy, Press, Registry, RNG } from '../../typechain';

export interface IInitialResult {
  loaded?: boolean;
  infrastructure: {
    contractNFT: NFT;
    contractRNG: RNG;
    contractPress: Press;
    contractRegistry: Registry;
    contractOracleProxy: OracleProxy;
    oracle: Signer;
    owner: Signer;
    addressOracle: string;
    addressOwner: string;
  };
}

let owner: Signer, oracle: Signer, contractRegistry: Registry;

let result: IInitialResult = <IInitialResult>{};

export async function init(): Promise<IInitialResult> {
  if (typeof result.loaded === 'undefined') {
    [owner, oracle] = await hre.ethers.getSigners();
    const addressOwner = await owner.getAddress();
    const addressOracle = await oracle.getAddress();

    const contractRegistry = await contractDeploy(owner, 'DKDAO Infrastructure/Registry');

    const contractOracleProxy = await contractDeploy(owner, 'DKDAO Infrastructure/OracleProxy');

    const contractNFT = await contractDeploy(
      owner,
      'DKDAO Infrastructure/NFT',
      contractRegistry.address,
      registryRecords.domain.infrastructure,
    );

    const contractRNG = await contractDeploy(
      owner,
      'DKDAO Infrastructure/RNG',
      contractRegistry.address,
      registryRecords.domain.infrastructure,
    );

    const contractPress = await contractDeploy(
      owner,
      'DKDAO Infrastructure/Press',
      contractRegistry.address,
      registryRecords.domain.infrastructure,
    );

    await contractRegistry.set(
      registryRecords.domain.infrastructure,
      registryRecords.name.oracle,
      contractOracleProxy.address,
      //addressOracle,
    );

    await contractRegistry.batchSet(
      [
        registryRecords.domain.infrastructure,
        registryRecords.domain.infrastructure,
        registryRecords.domain.infrastructure,
      ],
      [registryRecords.name.press, registryRecords.name.nft, registryRecords.name.rng],
      [contractPress.address, contractNFT.address, contractRNG.address],
    );

    await contractOracleProxy.addController(addressOracle);

    result = <any>{
      infrastructure: {
        contractNFT,
        contractRNG,
        contractPress,
        contractRegistry,
        contractOracleProxy,
        oracle,
        owner,
        addressOracle,
        addressOwner,
      },
    };
  }
  return result;
}
