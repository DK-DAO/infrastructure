/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Signer, Contract, ethers } from 'ethers';
import { registryRecords } from '../test/helpers/const';
// @ts-ignore
import { NFT, Press, Registry, RNG, DuelistKingDistributor, TestToken, OracleProxy } from '../typechain';

const contractCache: any = {};

interface IResultOfDKDAOInit {
  owner: ethers.Signer;
  contractRNG: RNG;
  contractPress: Press;
  contractNFT: NFT;
  contractRegistry: Registry;
  contractOracleProxy: OracleProxy;
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

export async function initDKDAOInfrastructure(
  hre: HardhatRuntimeEnvironment,
  owner: ethers.Signer,
  oracle: string[],
): Promise<IResultOfDKDAOInit> {
  const contractRegistry = <Registry>await contractDeploy(hre, owner, 'DKDAO Infrastructure/Registry');
  const contractOracleProxy = <OracleProxy>await contractDeploy(hre, owner, 'DKDAO Infrastructure/OracleProxy');

  const contractPress = <Press>(
    await contractDeploy(
      hre,
      owner,
      'DKDAO Infrastructure/Press',
      contractRegistry.address,
      registryRecords.domain.infrastructure,
    )
  );

  const contractNFT = <NFT>(
    await contractDeploy(
      hre,
      owner,
      'DKDAO Infrastructure/NFT',
      contractRegistry.address,
      registryRecords.domain.infrastructure,
    )
  );

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
    for (let i = 0; i < oracle.length; i += 1) {
      await contractOracleProxy.addController(oracle[i]);
    }
    await contractRegistry.batchSet(
      [
        registryRecords.domain.infrastructure,
        registryRecords.domain.infrastructure,
        registryRecords.domain.infrastructure,
        registryRecords.domain.infrastructure,
      ],
      [registryRecords.name.rng, registryRecords.name.nft, registryRecords.name.press, registryRecords.name.oracle],
      [contractRNG.address, contractNFT.address, contractPress.address, contractOracleProxy.address],
    );
  }
  return {
    owner,
    contractRNG,
    contractPress,
    contractNFT,
    contractRegistry,
    contractOracleProxy,
  };
}

export async function initDuelistKing(
  hre: HardhatRuntimeEnvironment,
  owner: ethers.Signer,
  oracle: string[],
  result: IResultOfDKDAOInit,
) {
  // const contractDAOToken = <DAOToken>await contractDeploy(hre, owner, 'Duelist King/DAOToken');

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
      result.contractRegistry.address,
      registryRecords.domain.duelistKing,
      theDivine,
    )
  );

  const contractOracleProxy = <OracleProxy>await contractDeploy(hre, owner, 'Duelist King/OracleProxy');

  // Init() is only able to be called once
  if (!(await result.contractRegistry.isExistRecord(registryRecords.domain.duelistKing, registryRecords.name.oracle))) {
    /*
    await contractDAOToken.init({
      symbol: 'DKT',
      name: 'Duelist King Token',
      grandDAO: zeroAddress,
      genesis: addressOwner,
    });
    */

    for (let i = 0; i < oracle.length; i += 1) {
      await contractOracleProxy.addController(oracle[i]);
    }

    await result.contractRegistry
      .connect(result.owner)
      .batchSet(
        [
          /* registryRecords.domain.duelistKing, */ registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
        ],
        [/* registryRecords.name.daoToken, */ registryRecords.name.distributor, registryRecords.name.oracle],
        [/* contractDAOToken.address, */ contractDuelistKingDistributor.address, contractOracleProxy.address],
      );
  }

  return {
    owner,
    // contractDAOToken,
    theDivine,
    contractDuelistKingDistributor,
    contractOracleProxy,
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
    const owner = hre.ethers.Wallet.fromMnemonic(process.env.DUELIST_KING_DEPLOY_MNEMONIC || '').connect(
      hre.ethers.provider,
    );

    const [dkDaoOracle, dkOracle1, dkOracle2, dkOracle3, tmp] = await hre.ethers.getSigners();
    if (hre.network.name === 'local') {
      await (
        await tmp.sendTransaction({
          to: owner.address,
          value: `0x8ac7230489e80000`,
        })
      ).wait();
    }

    const dkDaoOracleList = [await dkDaoOracle.getAddress()];
    const dkOracleList = [await dkOracle1.getAddress(), await dkOracle2.getAddress(), await dkOracle3.getAddress()];
    const ctxInfrastructure = await initDKDAOInfrastructure(hre, owner, dkDaoOracleList);
    const ctxDuelistKing = await initDuelistKing(hre, owner, dkOracleList, ctxInfrastructure);

    console.log('DK DAO Oracle:', await dkDaoOracle.getAddress());
    console.log('Duelist King Oracle:', dkOracleList.join(','));

    printDeployed(ctxInfrastructure);
    printDeployed(ctxDuelistKing);

    await ctxDuelistKing.contractOracleProxy.connect(dkOracle1).safeCall(
      ctxDuelistKing.contractDuelistKingDistributor.address,
      0,
      ctxDuelistKing.contractDuelistKingDistributor.interface.encodeFunctionData('newCampaign', [
        {
          opened: 0,
          softCap: 1000000,
          deadline: 0,
          generation: 0,
          start: 0,
          end: 19,
          distribution: [
            '0x00000000000000000000000000000001000000000000000600000000000009c4',
            '0x000000000000000000000000000000020000000100000005000009c400006b6c',
            '0x00000000000000000000000000000003000000030000000400006b6c00043bfc',
            '0x00000000000000000000000000000004000000060000000300043bfc000fadac',
            '0x000000000000000000000000000000050000000a00000002000fadac0026910c',
            '0x000000000000000000000000000000050000000f000000010026910c004c4b40',
          ],
        },
      ]),
    );
    if (hre.network.name === 'local') {
      const contractTestToken = <TestToken>await contractDeploy(hre, owner, 'DKDAO Infrastructure/TestToken');
      console.log('Test token:', contractTestToken.address);
      // Buy first 40 loot boxes
      await contractTestToken
        .connect(owner)
        .transfer('0x9ccc80a5beD6f15AdFcB9096109500B3c96a8e52', '40000000000000000000');

      // Buy first 40 loot boxes
      await contractTestToken
        .connect(owner)
        .transfer('0x9ccc80a5beD6f15AdFcB9096109500B3c96a8e52', '10000000000000000000');
      // Buy first 40 loot boxes
      await contractTestToken
        .connect(owner)
        .transfer('0x9ccc80a5beD6f15AdFcB9096109500B3c96a8e52', '5000000000000000000');
    }
  });

export default {};
