import hre from 'hardhat';
import { Signer } from 'ethers';
import { contractDeploy } from './functions';
import { registryRecords } from './const';
import { NFT, OracleProxy, Press, Registry, RNG } from '../../typechain';

export interface IInitialDKDAOInfrastructureResult {
  infrastructure: {
    contractRNG: RNG;
    contractRegistry: Registry;
    contractPress: Press;
    contractNFT: NFT;
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

  const contractPress = await contractDeploy(
    owner,
    'DKDAO Infrastructure/Press',
    contractRegistry.address,
    registryRecords.domain.infrastructure,
  );

  const contractNFT = <NFT>await contractDeploy(owner, 'DKDAO Infrastructure/NFT');

  const contractRNG = await contractDeploy(
    owner,
    'DKDAO Infrastructure/RNG',
    contractRegistry.address,
    registryRecords.domain.infrastructure,
  );

  // Init() is only able to be called once
  if (!(await contractRegistry.isExistRecord(registryRecords.domain.infrastructure, registryRecords.name.oracle))) {
    await contractNFT.init('DKDAO NFT', 'DKN', contractRegistry.address, registryRecords.domain.infrastructure);
    const tx = await contractRegistry.batchSet(
      [
        registryRecords.domain.infrastructure,
        registryRecords.domain.infrastructure,
        registryRecords.domain.infrastructure,
        registryRecords.domain.infrastructure,
      ],
      [registryRecords.name.rng, registryRecords.name.nft, registryRecords.name.press, registryRecords.name.oracle],
      [contractRNG.address, contractNFT.address, contractPress.address, contractOracleProxy.address],
    );
    await contractOracleProxy.addController(addressOracle);
    await tx.wait();
  }
  return <IInitialDKDAOInfrastructureResult>{
    infrastructure: {
      contractRNG,
      contractPress,
      contractNFT,
      contractRegistry,
      contractOracleProxy,
      oracle,
      owner,
      addressOracle,
      addressOwner,
    },
  };
}
