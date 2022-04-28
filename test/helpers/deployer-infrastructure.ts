import { Signer } from 'ethers';
import Deployer from './deployer';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { registryRecords } from './const';

export interface IOperators {
  operator: Signer;
  oracles: Signer[];
}

export interface IConfiguration {
  network: string;
  salesAgent: Signer;
  infrastructure: IOperators;
  duelistKing: IOperators;
}

export interface IOperatorsExtend {
  operator: Signer;
  operatorAddress: string;
  oracles: Signer[];
  oracleAddresses: string[];
}

export interface IConfigurationExtend {
  network: string;
  salesAgent: Signer;
  salesAgentAddress: string;
  infrastructure: IOperatorsExtend;
  duelistKing: IOperatorsExtend;
}

async function getAddresses(singers: Signer[]): Promise<string[]> {
  const tmp = [];
  for (let i = 0; i < singers.length; i++) {
    tmp[i] = await singers[i].getAddress();
  }
  return tmp;
}

async function extendConfig(conf: IConfiguration): Promise<IConfigurationExtend> {
  const { network, salesAgent, infrastructure, duelistKing } = conf;
  return {
    network,
    salesAgent,
    salesAgentAddress: await salesAgent.getAddress(),
    infrastructure: {
      operator: infrastructure.operator,
      operatorAddress: await infrastructure.operator.getAddress(),
      oracles: infrastructure.oracles,
      oracleAddresses: await getAddresses(infrastructure.oracles),
    },
    duelistKing: {
      operator: duelistKing.operator,
      operatorAddress: await duelistKing.operator.getAddress(),
      oracles: duelistKing.oracles,
      oracleAddresses: await getAddresses(duelistKing.oracles),
    },
  };
}

export default async function init(
  hre: HardhatRuntimeEnvironment,
  config: IConfiguration,
): Promise<{ deployer: Deployer; config: IConfigurationExtend }> {
  const deployer = Deployer.getInstance(hre);
  // Connect to infrastructure operator
  deployer.connect(config.infrastructure.operator);

  // Deploy registry
  const registry = await deployer.contractDeploy('Infrastructure/Registry', []);

  // Deploy oracle proxy
  await deployer.contractDeploy(
    'Infrastructure/OracleProxy',
    [],
    registry.address,
    registryRecords.domain.infrastructure,
  );

  // Deploy RNG
  await deployer.contractDeploy('Infrastructure/RNG', [], registry.address, registryRecords.domain.infrastructure);

  return {
    deployer,
    config: await extendConfig(config),
  };
}
