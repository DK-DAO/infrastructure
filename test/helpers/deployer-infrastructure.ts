import { Signer } from 'ethers';
import Deployer from './deployer';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { registryRecords } from './const';

export interface IOperators {
  operator: Signer;
  operatorAddress: string;
  oracles: string[];
}

export interface IConfiguration {
  network: string;
  infrastructure: IOperators;
  duelistKing: IOperators;
}

export default async function init(hre: HardhatRuntimeEnvironment, config: IConfiguration): Promise<Deployer> {
  const deployer = Deployer.getInstance(hre);
  // Connect to infrastructure operator
  deployer.connect(config.infrastructure.operator);

  // Deploy libraries
  await deployer.contractDeploy('Libraries/Verifier', []);

  // Deploy registry
  const registry = await deployer.contractDeploy('Infrastructure/Registry', []);

  // Deploy oracle proxy
  await deployer.contractDeploy(
    'Infrastructure/OracleProxy',
    ['Verifier'],
    registry.address,
    registryRecords.domain.infrastructure,
  );

  // Deploy press
  await deployer.contractDeploy('Infrastructure/Press', [], registry.address, registryRecords.domain.infrastructure);

  // Deploy nft
  await deployer.contractDeploy('Infrastructure/NFT', []);

  // Deploy RNG
  await deployer.contractDeploy('Infrastructure/RNG', [], registry.address, registryRecords.domain.infrastructure);

  return deployer;
}
