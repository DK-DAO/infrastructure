import Deployer from './deployer';
import { registryRecords } from './const';
import { IConfiguration } from './deployer-infrastructure';
import { NFT, Registry, RNG, Press, OracleProxy } from '../../typechain';
import { ContractReceipt, ContractTransaction } from '@ethersproject/contracts';
import { printAllEvents } from './functions';

async function getContractAddress(contractTx: ContractTransaction) {
  const txResult = await contractTx.wait();
  const [createNewNftEvent] = txResult.events || [];
  if (createNewNftEvent) {
    const [, newNftAddress] = createNewNftEvent.args || [undefined, undefined];
    return newNftAddress;
  }
  throw new Error('Unexpected result');
}

export default async function init(deployer: Deployer, config: IConfiguration): Promise<Deployer> {
  // Deploy libraries
  await deployer.contractDeploy('Libraries/Bytes', []);
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

  const duelistKingOracleProxy = <OracleProxy>deployer.getDeployedContract('Duelist King/OracleProxy');

  const distributor = await deployer.contractDeploy(
    'Duelist King/DuelistKingDistributor',
    [],
    registry.address,
    registryRecords.domain.duelistKing,
    txResult.contractAddress,
  );

  // Init project
  await deployer.safeExecute(async () => {
    // The real oracle that we searching for
    /*
    for (let i = 0; i < infra.length; i += 1) {
      await oracle.addController(realOracles[i]);
    }*/

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
        ],
      ),
    );

    const duelistKingNft = await getContractAddress(
      await press
        .connect(config.infrastructure.operator)
        .createNewNFT('DuelistKingCard', 'DKC', 'https://metadata.dkdao.network/dk-card/'),
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
          registryRecords.name.distributor,
          registryRecords.name.nft,
        ],
        [
          // Duelist King
          distributor.address,
          duelistKingNft,
        ],
      ),
    );
  });

  return deployer;
}
