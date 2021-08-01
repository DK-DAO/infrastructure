/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Signer, Contract } from 'ethers';
import { registryRecords, zeroAddress } from '../test/helpers/const';
// @ts-ignore
import { NFT, Press, Registry, RNG, DAO, DAOToken, DuelistKingDistributor, Pool, TestToken } from '../typechain';

const cardList = [
  'Verdict of God',
  'Banished Fairy',
  'Wrath of The Sea',
  'Eternal Storm',
  'Skadi',
  'Unforgiven Creatures',
  'Deadly Pool',
  'Euphemia',
  'Sayyida',
  'Shadowmare',
  "Deepsea's Hunger",
  'Krakenetics',
  'Death Knight',
  'Mighty Fist',
  'Aoife',
  'Corock',
  'Little Johnny',
  'Nix',
  'Regalia of the Sea',
  'Undying Sailor',
];

const contractCache: any = {};

function cardToSymbol(cardId: number) {
  const rarenessMap = [6, 5, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1];
  const mapSym = new Map<number, string>();
  mapSym.set(6, 'L');
  mapSym.set(5, 'SSR');
  mapSym.set(4, 'SR');
  mapSym.set(3, 'R');
  mapSym.set(2, 'U');
  mapSym.set(1, 'C');
  const rareness = mapSym.get(rarenessMap[cardId]);
  return `${rareness}>${cardList[cardId].replace(/[\s']/g, '').toUpperCase()}`;
}

export async function contractDeploy(
  hre: HardhatRuntimeEnvironment,
  actor: Signer,
  contractPath: string,
  ...params: any[]
): Promise<Contract> {
  const contractParts = contractPath.split('/');
  const contractName = contractParts.length === 2 ? contractParts[1] : contractParts[0];
  if (typeof contractCache[contractPath] === 'undefined') {
    const instanceFactory = await hre.ethers.getContractFactory(contractName);
    contractCache[contractPath] = await instanceFactory.connect(actor).deploy(...params);
  }
  return contractCache[contractPath];
}

export interface IInitialDKDAOInfrastructureResult {
  infrastructure: {
    contractRNG: RNG;
    contractRegistry: Registry;
    contractTestToken: TestToken;
    contractPress: Press;
    contractNFT: NFT;
    oracle: Signer;
    owner: Signer;
    addressOracle: string;
    addressOwner: string;
  };
}

export interface IInitialDuelistKingResult extends IInitialDKDAOInfrastructureResult {
  duelistKing: {
    contractDuelistKingDistributor: DuelistKingDistributor;
    contractDAO: DAO;
    contractDAOToken: DAOToken;
    contractPool: Pool;
    oracle: Signer;
    owner: Signer;
    addressOracle: string;
    addressOwner: string;
  };
}

export async function initDKDAOInfrastructure(
  hre: HardhatRuntimeEnvironment,
): Promise<IInitialDKDAOInfrastructureResult> {
  const [owner, oracle] = await hre.ethers.getSigners();
  const addressOwner = await owner.getAddress();
  const addressOracle = await oracle.getAddress();

  const contractRegistry = <Registry>await contractDeploy(hre, owner, 'DKDAO Infrastructure/Registry');

  const contractTestToken = <TestToken>await contractDeploy(hre, owner, 'DKDAO Infrastructure/TestToken');

  const contractPress = <Press>(
    await contractDeploy(
      hre,
      owner,
      'DKDAO Infrastructure/Press',
      contractRegistry.address,
      registryRecords.domain.infrastructure,
    )
  );

  const contractNFT = <NFT>await contractDeploy(hre, owner, 'DKDAO Infrastructure/NFT');

  const contractRNG = <RNG>(
    await contractDeploy(
      hre,
      owner,
      'DKDAO Infrastructure/RNG',
      contractRegistry.address,
      registryRecords.domain.infrastructure,
    )
  );

  // Init() is only able to be called once
  if (!(await contractRegistry.isExistRecord(registryRecords.domain.infrastructure, registryRecords.name.oracle))) {
    await contractNFT.init('DKDAO NFT', 'DKN', contractRegistry.address, registryRecords.domain.infrastructure);

    await contractRegistry.batchSet(
      [
        registryRecords.domain.infrastructure,
        registryRecords.domain.infrastructure,
        registryRecords.domain.infrastructure,
        registryRecords.domain.infrastructure,
      ],
      [registryRecords.name.rng, registryRecords.name.nft, registryRecords.name.press, registryRecords.name.oracle],
      [contractRNG.address, contractNFT.address, contractPress.address, addressOracle],
    );
  }
  return {
    infrastructure: {
      contractRNG,
      contractPress,
      contractNFT,
      contractTestToken,
      contractRegistry,
      oracle,
      owner,
      addressOracle,
      addressOwner,
    },
  };
}

export async function initDuelistKing(hre: HardhatRuntimeEnvironment) {
  const [, , owner, oracle] = await hre.ethers.getSigners();
  const result = await initDKDAOInfrastructure(hre);
  const addressOwner = await owner.getAddress();
  const addressOracle = await oracle.getAddress();

  const contractDAO = <DAO>await contractDeploy(hre, owner, 'Duelist King/DAO');

  const contractDAOToken = <DAOToken>await contractDeploy(hre, owner, 'Duelist King/DAOToken');

  const contractPool = <Pool>await contractDeploy(hre, owner, 'Duelist King/Pool');

  // The Divine Contract https://github.com/chiro-hiro/thedivine
  const tx = await owner.sendTransaction({
    data: '0x601a803d90600a8239f360203d333218600a57fd5b8181805482430340188152208155f3',
  });

  const theDivine = (await tx.wait()).contractAddress;

  const contractDuelistKingDistributor = <DuelistKingDistributor>(
    await contractDeploy(
      hre,
      owner,
      'Duelist King/DuelistKingDistributor',
      result.infrastructure.contractRegistry.address,
      registryRecords.domain.duelistKing,
      theDivine,
    )
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
          registryRecords.name.distributor,
          registryRecords.name.oracle,
        ],
        [
          contractDAO.address,
          contractDAOToken.address,
          contractPool.address,
          contractDuelistKingDistributor.address,
          addressOracle,
        ],
      );
  }

  for (let i = 0; i < 20; i += 1) {
    console.log(`Issue card: ${cardToSymbol(i).padEnd(32, ' ')}Name: ${cardList[i]}`);
    await contractDuelistKingDistributor.connect(oracle).issueCard(cardList[i], cardToSymbol(i));
  }

  await contractDuelistKingDistributor.connect(oracle).newCampaign({
    distribution: [
      '0x000000000000000000000000000000010000000000001fff0000000000ffffff',
      '0x00000000000000010000000000000002000000000000ffff0000000000ffffff',
      '0x00000000000000030000000000000003000000000007ffff0000000000ffffff',
      '0x0000000000000006000000000000000400000000000fffff0000000000ffffff',
      '0x000000000000000a000000000000000500000000003fffff0000000000ffffff',
      '0x000000000000000f000000000000000500000000ffffffff0000000000ffffff',
    ],
    opened: 0,
    softCap: 1000000,
    deadline: 0,
    generation: 0,
    start: 1,
    end: 21,
    designs: 20,
  });

  return <IInitialDuelistKingResult>{
    ...result,
    duelistKing: {
      owner,
      oracle,
      addressOracle,
      addressOwner,
      contractDAO,
      contractDAOToken,
      contractPool,
      contractDuelistKingDistributor,
    },
  };
}

function printDeployed(obj: any) {
  const entries = Object.entries(obj);
  for (let i = 0; i < entries.length; i += 1) {
    const [k, v]: [string, any] = entries[i];
    if (typeof v.address === 'string') {
      process.stdout.write(`${k}: ${v.address}\n`);
    }
  }
}

task('deploy', 'Deploy all contract')
  // .addParam('account', "The account's address")
  .setAction(async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const ctx = await initDuelistKing(hre);
    printDeployed(ctx.infrastructure);
    printDeployed(ctx.duelistKing);

    // Buy first 40 loot boxes
    await ctx.infrastructure.contractTestToken
      .connect(ctx.infrastructure.owner)
      .transfer('0x9ccc80a5beD6f15AdFcB9096109500B3c96a8e52', '40000000000000000000');
    // Buy first 40 loot boxes
    await ctx.infrastructure.contractTestToken
      .connect(ctx.infrastructure.owner)
      .transfer('0x9ccc80a5beD6f15AdFcB9096109500B3c96a8e52', '10000000000000000000');
    // Buy first 40 loot boxes
    await ctx.infrastructure.contractTestToken
      .connect(ctx.infrastructure.owner)
      .transfer('0x9ccc80a5beD6f15AdFcB9096109500B3c96a8e52', '5000000000000000000');
  });

export default {};
