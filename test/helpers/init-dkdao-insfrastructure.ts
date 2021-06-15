import hre from 'hardhat';
import { Signer } from 'ethers';
import { contractDeploy } from './functions';
import { registryRecords } from './const';
import { OracleProxy, Registry, RNG } from '../../typechain';

export interface IInitialDKDAOInfrastructureResult {
  infrastructure: {
    contractRNG: RNG;
    contractRegistry: Registry;
    contractOracleProxy: OracleProxy;
    oracle: Signer;
    owner: Signer;
    addressOracle: string;
    addressOwner: string;
  };
}

export async function initDKDAOInfrastructure() {
  let owner: Signer, oracle: Signer;
  [owner, oracle] = await hre.ethers.getSigners();
  const addressOwner = await owner.getAddress();
  const addressOracle = await oracle.getAddress();

  const contractRegistry = await contractDeploy(owner, 'DKDAO Infrastructure/Registry');

  const contractOracleProxy = await contractDeploy(owner, 'DKDAO Infrastructure/OracleProxy');

  const contractRNG = await contractDeploy(
    owner,
    'DKDAO Infrastructure/RNG',
    contractRegistry.address,
    registryRecords.domain.infrastructure,
  );

  // Init() is only able to be called once
  if (!(await contractRegistry.isExistRecord(registryRecords.domain.infrastructure, registryRecords.name.oracle))) {
    await contractRegistry.set(
      registryRecords.domain.infrastructure,
      registryRecords.name.oracle,
      contractOracleProxy.address,
    );

    await contractRegistry.batchSet(
      [registryRecords.domain.infrastructure],
      [registryRecords.name.rng],
      [contractRNG.address],
    );

    await contractOracleProxy.addController(addressOracle);
  }
  return <IInitialDKDAOInfrastructureResult>{
    infrastructure: {
      contractRNG,
      contractRegistry,
      contractOracleProxy,
      oracle,
      owner,
      addressOracle,
      addressOwner,
    },
  };
}
