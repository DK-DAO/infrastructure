import Deployer from './deployer';
import { registryRecords } from './const';
import { IConfigurationExtend } from './deployer-infrastructure';
import { NFT, Registry, RNG, OracleProxy, DuelistKingDistributor, DuelistKingMerchant } from '../../typechain';
import { printAllEvents } from './functions';

export interface IDeployContext {
  deployer: Deployer;
  config: IConfigurationExtend;
  infrastructure: {
    rng: RNG;
    registry: Registry;
    oracle: OracleProxy;
  };
  duelistKing: {
    oracle: OracleProxy;
    distributor: DuelistKingDistributor;
    merchant: DuelistKingMerchant;
    card: NFT;
    item: NFT;
  };
}

export default async function init(context: {
  deployer: Deployer;
  config: IConfigurationExtend;
}): Promise<IDeployContext> {
  const { deployer, config } = context;
  // Deploy libraries
  deployer.connect(config.duelistKing.operator);

  const registry = <Registry>deployer.getDeployedContract('Infrastructure/Registry');
  const rng = <RNG>deployer.getDeployedContract('Infrastructure/RNG');
  const infrastructureOracleProxy = <OracleProxy>deployer.getDeployedContract('Infrastructure/OracleProxy');

  // The Divine Contract https://github.com/chiro-hiro/thedivine
  let theDivineContract;

  if (deployer.getChainId() <= 0) {
    throw new Error('Chain ID can not less than 0');
  }

  switch (deployer.getChainId()) {
    case 56:
      console.log('\tLoad existing The Divine contract');
      theDivineContract = await deployer.contractAttach(
        'Chiro/ITheDivine',
        '0xF52a83a3B7d918B66BD9ae117519ddC436A82031',
      );
      break;
    default:
      theDivineContract = await deployer.deployTheDivine();
  }

  const duelistKingOracleProxy = <OracleProxy>(
    await deployer.contractDeploy('Duelist King/OracleProxy', [], registry.address, registryRecords.domain.duelistKing)
  );

  const distributor = <DuelistKingDistributor>(
    await deployer.contractDeploy(
      'Duelist King/DuelistKingDistributor',
      [],
      registry.address,
      registryRecords.domain.duelistKing,
      theDivineContract.address,
    )
  );

  const card = <NFT>(
    await deployer.contractDeploy(
      'Duelist King Card/NFT',
      [],
      registry.address,
      registryRecords.domain.duelistKing,
      'DuelistKingCard',
      'DKC',
      'https://metadata.duelistking.com/card/',
    )
  );

  const item = <NFT>(
    await deployer.contractDeploy(
      'Duelist King Item/NFT',
      [],
      registry.address,
      registryRecords.domain.duelistKing,
      'DuelistKingItem',
      'DKI',
      'https://metadata.duelistking.com/item/',
    )
  );

  const merchant = <DuelistKingMerchant>(
    await deployer.contractDeploy(
      'Duelist King/DuelistKingMerchant',
      [],
      registry.address,
      registryRecords.domain.duelistKing,
    )
  );

  await deployer.safeExecute(async () => {
    // The real oracle that we searching for
    await printAllEvents(
      await registry.batchSet(
        [
          // Infrastructure
          registryRecords.domain.infrastructure,
          registryRecords.domain.infrastructure,
          registryRecords.domain.infrastructure,
          //Duelist King
          registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
          registryRecords.domain.duelistKing,
        ],
        [
          // Infrastructure
          registryRecords.name.operator,
          registryRecords.name.oracle,
          registryRecords.name.rng,
          // Duelist King
          registryRecords.name.operator,
          registryRecords.name.oracle,
          registryRecords.name.distributor,
          registryRecords.name.merchant,
          registryRecords.name.salesAgent,
        ],
        [
          // Infrastructure
          config.infrastructure.operatorAddress,
          infrastructureOracleProxy.address,
          rng.address,
          // Duelist King
          config.duelistKing.operatorAddress,
          duelistKingOracleProxy.address,
          distributor.address,
          merchant.address,
          config.salesAgentAddress,
        ],
      ),
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
          card.address,
          item.address,
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
      oracle: infrastructureOracleProxy,
    },
    duelistKing: {
      oracle: duelistKingOracleProxy,
      distributor,
      merchant,
      card,
      item,
    },
  };
}
