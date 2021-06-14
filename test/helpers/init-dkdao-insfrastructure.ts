import hre from 'hardhat';
import { Signer } from 'ethers';
import { contractDeploy } from './functions';
import { registryRecords } from './const';
import { NFT, OracleProxy, Press, Registry, RNG } from '../../typechain';

export interface IInitialDKDAOInfrastructureResult {
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

export async function initDKDAOInfrastructure() {
  let owner: Signer, oracle: Signer;
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

  // Init() is only able to be called once
  if (!(await contractRegistry.isExistRecord(registryRecords.domain.infrastructure, registryRecords.name.oracle))) {
    await contractRegistry.set(
      registryRecords.domain.infrastructure,
      registryRecords.name.oracle,
      contractOracleProxy.address,
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
  }
  return <IInitialDKDAOInfrastructureResult>{
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
