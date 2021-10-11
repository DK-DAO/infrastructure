import Deployer from './deployer';
import { registryRecords } from './const';
import { IConfigurationExtend } from './deployer-infrastructure';
import { NFT, Registry, RNG, Press, OracleProxy, DuelistKingDistributor } from '../../typechain';
import { ContractTransaction } from '@ethersproject/contracts';
import { printAllEvents } from './functions';

export interface IDeployContext {
  deployer: Deployer;
  config: IConfigurationExtend;
  infrastructure: {
    rng: RNG;
    registry: Registry;
    press: Press;
    nft: NFT;
    oracle: OracleProxy;
  };
  duelistKing: {
    oracle: OracleProxy;
    distributor: DuelistKingDistributor;
  };
}

async function getContractAddress(contractTx: ContractTransaction) {
  const txResult = await contractTx.wait();
  const [createNewNftEvent] = txResult.events || [];
  if (createNewNftEvent) {
    const [, newNftAddress] = createNewNftEvent.args || [undefined, undefined];
    return newNftAddress;
  }
  throw new Error('Unexpected result');
}

export default async function init(context: {
  deployer: Deployer;
  config: IConfigurationExtend;
}): Promise<IDeployContext> {
  const { deployer, config } = context;
  // Deploy libraries
  deployer.connect(config.duelistKing.operator);

  // Deploy token
  await deployer.contractDeploy('Duelist King/DuelistKingToken', [], await config.duelistKing.operator.getAddress());

  const registry = <Registry>deployer.getDeployedContract('Infrastructure/Registry');
  const nft = <NFT>deployer.getDeployedContract('Infrastructure/NFT');
  const rng = <RNG>deployer.getDeployedContract('Infrastructure/RNG');
  const press = <Press>deployer.getDeployedContract('Infrastructure/Press');
  const infrastructureOracleProxy = <OracleProxy>deployer.getDeployedContract('Infrastructure/OracleProxy');

  // The Divine Contract https://github.com/chiro-hiro/thedivine
  const txResult = await (
    await config.duelistKing.operator.sendTransaction({
      data: '0x601a803d90600a8239f360203d333218600a57fd5b8181805482430340188152208155f3',
    })
  ).wait();

  const duelistKingOracleProxy = <OracleProxy>(
    await deployer.contractDeploy('Duelist King/OracleProxy', [], registry.address, registryRecords.domain.duelistKing)
  );

  const distributor = <DuelistKingDistributor>(
    await deployer.contractDeploy(
      'Duelist King/DuelistKingDistributor',
      [],
      registry.address,
      registryRecords.domain.duelistKing,
      txResult.contractAddress,
    )
  );

  // Init project
  await deployer.safeExecute(async () => {
    // The real oracle that we searching for
    await printAllEvents(
      await registry.batchSet(
        [
          // Infrastructure
          registryRecords.domain.infrastructure,
          registryRecords.domain.infrastructure,
          registryRecords.domain.infrastructure,
          registryRecords.domain.infrastructure,
          //Duelist King
          registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
        ],
        [
          // Infrastructure
          registryRecords.name.rng,
          registryRecords.name.nft,
          registryRecords.name.press,
          registryRecords.name.oracle,
          // Duelist King
          registryRecords.name.distributor,
          registryRecords.name.oracle,
          registryRecords.name.operator,
        ],
        [
          // Infrastructure
          rng.address,
          nft.address,
          press.address,
          infrastructureOracleProxy.address,
          // Duelist King
          distributor.address,
          duelistKingOracleProxy.address,
          config.duelistKing.operatorAddress,
        ],
      ),
    );

    const duelistKingCard = await getContractAddress(
      await press
        .connect(config.infrastructure.operator)
        .createNewNFT('DuelistKingCard', 'DKC', 'https://metadata.dkdao.network/dk-card/'),
    );

    const duelistKingItem = await getContractAddress(
      await press
        .connect(config.infrastructure.operator)
        .createNewNFT('DuelistKingCard', 'DKC', 'https://metadata.dkdao.network/dk-item/'),
    );

    await printAllEvents(
      await registry.batchSet(
        [
          // Duelist King
          registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
        ],
        [
          // Duelist King
          registryRecords.name.card,
          registryRecords.name.item,
        ],
        [
          // Duelist King
          duelistKingCard,
          duelistKingItem,
        ],
      ),
    );

    for (let i = 0; i < config.infrastructure.oracles.length; i += 1) {
      await printAllEvents(await infrastructureOracleProxy.addController(config.infrastructure.oracleAddresses[i]));
    }

    for (let i = 0; i < config.duelistKing.oracles.length; i += 1) {
      await printAllEvents(await duelistKingOracleProxy.addController(config.duelistKing.oracleAddresses[i]));
    }
  });

  return {
    deployer,
    config,
    infrastructure: {
      rng,
      registry,
      press,
      nft,
      oracle: infrastructureOracleProxy,
    },
    duelistKing: {
      oracle: duelistKingOracleProxy,
      distributor,
    },
  };
}
