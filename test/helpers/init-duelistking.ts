import hre from 'hardhat';
import { Signer } from 'ethers';
import { contractDeploy } from './functions';
import { registryRecords, zeroAddress } from './const';
import { IInitialDKDAOInfrastructureResult, initDKDAOInfrastructure } from './init-dkdao-insfrastructure';
import { DAO, DAOToken, DuelistKingNFT, OracleProxy, Pool } from '../../typechain';

export interface IInitialDuelistKingResult extends IInitialDKDAOInfrastructureResult {
  duelistKing: {
    contractDuelistKingNFT: DuelistKingNFT;
    contractDAO: DAO;
    contractDAOToken: DAOToken;
    contractOracleProxy: OracleProxy;
    contractPool: Pool;
    oracle: Signer;
    owner: Signer;
    addressOracle: string;
    addressOwner: string;
  };
}

export async function initDuelistKing() {
  let owner: Signer, oracle: Signer;
  [, , owner, oracle] = await hre.ethers.getSigners();
  const result = await initDKDAOInfrastructure();
  const addressOwner = await owner.getAddress();
  const addressOracle = await oracle.getAddress();
  const contractDAO = <DAO>await contractDeploy(owner, 'Duelist King/DAO');

  const contractDAOToken = <DAOToken>await contractDeploy(owner, 'Duelist King/DAOToken');

  const contractOracleProxy = await contractDeploy(owner, 'Duelist King/OracleProxy');


  const contractPool = await contractDeploy(owner, 'Duelist King/Pool');

  // The Divine Contract https://github.com/chiro-hiro/thedivine
  const tx = await owner.sendTransaction({
    data: '0x601a803d90600a8239f360203d333218600a57fd5b8181805482430340188152208155f3',
  });

  const theDivine = (await tx.wait()).contractAddress;

  const contractDuelistKingNFT = await contractDeploy(
    owner,
    'Duelist King/DuelistKingNFT',
    result.infrastructure.contractRegistry.address,
    registryRecords.domain.duelistKing,
    theDivine,
  );

  // Init() is only able to be called once
  if (
    !(await result.infrastructure.contractRegistry.isExistRecord(
      registryRecords.domain.duelistKing,
      registryRecords.name.dao,
    ))
  ) {
    await contractDAO.init(result.infrastructure.contractRegistry.address, registryRecords.domain.duelistKing);

    await contractDAOToken.init({
      symbol: 'DKT',
      name: 'Duelist King Token',
      grandDAO: zeroAddress,
      genesis: addressOwner,
    });

    await contractOracleProxy.connect(owner).addController(addressOracle);

    await result.infrastructure.contractRegistry
      .connect(result.infrastructure.owner)
      .batchSet(
        [
          registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
        ],
        [
          registryRecords.name.dao,
          registryRecords.name.daoToken,
          registryRecords.name.pool,
          registryRecords.name.nft,
          registryRecords.name.oracle,
        ],
        [
          contractDAO.address,
          contractDAOToken.address,
          contractPool.address,
          contractDuelistKingNFT.address,
          contractOracleProxy.address,
        ],
      );
  }

  return <IInitialDuelistKingResult>{
    ...result,
    duelistKing: {
      owner,
      oracle,
      addressOracle,
      addressOwner,
      contractDAO,
      contractDAOToken,
      contractOracleProxy,
      contractPool,
      contractDuelistKingNFT,
    },
  };
}
