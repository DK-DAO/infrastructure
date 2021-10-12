import hre from 'hardhat';
import { expect } from 'chai';
import { registryRecords } from './helpers/const';
import initInfrastructure from './helpers/deployer-infrastructure';
import initDuelistKing, { IDeployContext } from './helpers/deployer-duelist-king';

let context: IDeployContext;

describe('Registry', () => {
  it('all initialized should be correct', async () => {
    const accounts = await hre.ethers.getSigners();
    context = await initDuelistKing(
      await initInfrastructure(hre, {
        network: hre.network.name,
        infrastructure: {
          operator: accounts[0],
          oracles: [accounts[1]],
        },
        duelistKing: {
          operator: accounts[2],
          oracles: [accounts[3]],
        },
      }),
    );
  });

  it('infrastructure operator must be set correctly', async () => {
    const {
      infrastructure: { registry },
      config: { infrastructure },
    } = context;
    expect(await registry.getAddress(registryRecords.domain.infrastructure, registryRecords.name.operator)).to.eq(
      infrastructure.operatorAddress,
    );
  });

  it('all records in registry should be set correctly for Infrastructure domain', async () => {
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
      infrastructure: { registry },
      config: { infrastructure },
    } = context;
    const [domain, name] = await registry.getDomainAndName(infrastructure.operatorAddress);
    expect(domain).to.eq(registryRecords.domain.infrastructure);
    expect(name).to.eq(registryRecords.name.operator);
  });
});
