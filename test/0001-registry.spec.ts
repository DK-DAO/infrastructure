import hre from 'hardhat';
import { expect } from 'chai';
import { registryRecords } from './helpers/const';
import initInfrastructure, { IConfiguration } from './helpers/deployer-infrastructure';
import initDuelistKing, { IDeployContext } from './helpers/deployer-duelist-king';
import { Registry } from '../typechain';
import Deployer from './helpers/deployer';

let config: IConfiguration;
let context: IDeployContext;

describe('Registry', () => {
  it('account[0] must be the owner of registry', async () => {
    const accounts = await hre.ethers.getSigners();
    config = {
      network: hre.network.name,
      infrastructure: {
        operator: accounts[0],
        operatorAddress: accounts[0].address,
        oracles: [accounts[1].address],
      },
      duelistKing: {
        operator: accounts[2],
        operatorAddress: accounts[2].address,
        oracles: [accounts[3].address],
      },
    };
    context = await initDuelistKing(await initInfrastructure(hre, config), config);
  });

  it('infrastructure operator must be set correctly', async () => {
    expect(
      await context.infrastructure.registry.getAddress(
        registryRecords.domain.infrastructure,
        registryRecords.name.operator,
      ),
    ).to.eq(config.infrastructure.operatorAddress);
  });

  it('All records in registry should be set correctly for DKDAO infrastructure domain', async () => {
    const {
      infrastructure: { registry, oracle, nft, press, rng },
    } = context;
    expect(oracle.address).to.eq(
      await registry.getAddress(registryRecords.domain.infrastructure, registryRecords.name.oracle),
    );
    expect(nft.address).to.eq(
      await registry.getAddress(registryRecords.domain.infrastructure, registryRecords.name.nft),
    );
    expect(rng.address).to.eq(
      await registry.getAddress(registryRecords.domain.infrastructure, registryRecords.name.rng),
    );
    expect(press.address).to.eq(
      await registry.getAddress(registryRecords.domain.infrastructure, registryRecords.name.press),
    );
  });

  it('All records in registry should be set correctly for Duelist King domain', async () => {
    const {
      infrastructure: { registry },
      duelistKing: { distributor, oracle },
    } = context;
    expect(oracle.address).to.eq(
      await registry.getAddress(registryRecords.domain.duelistKing, registryRecords.name.oracle),
    );
    expect(distributor.address).to.eq(
      await registry.getAddress(registryRecords.domain.duelistKing, registryRecords.name.distributor),
    );
  });

  it('reversed mapping should be correct', async () => {
    const {
      infrastructure: { rng, registry },
    } = context;
    const [domain, name] = await registry.getDomainAndName(config.infrastructure.operatorAddress);
    expect(domain).to.eq(registryRecords.domain.infrastructure);
    expect(name).to.eq(registryRecords.name.operator);
  });
});
