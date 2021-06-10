import { expect } from 'chai';
import { IInitialResult, init } from './helpers/deployment';
import { registryRecords } from './helpers/const';

let ctx: IInitialResult;

describe('Registry', () => {
  it('account[0] must be the owner of registry', async () => {
    ctx = await init();
    const {
      infrastructure: { contractRegistry, owner },
    } = ctx;
    expect(await contractRegistry.owner()).to.eq(await owner.getAddress());
  });

  it('All records in registry should be set correctly', async () => {
    const {
      infrastructure: { contractRNG, contractOracleProxy, contractPress, contractRegistry, contractNFT },
    } = ctx;
    expect(contractOracleProxy.address).to.eq(
      await contractRegistry.getAddress(registryRecords.domain.infrastructure, registryRecords.name.oracle),
    );
    expect(contractPress.address).to.eq(
      await contractRegistry.getAddress(registryRecords.domain.infrastructure, registryRecords.name.press),
    );
    expect(contractNFT.address).to.eq(
      await contractRegistry.getAddress(registryRecords.domain.infrastructure, registryRecords.name.nft),
    );
    expect(contractRNG.address).to.eq(
      await contractRegistry.getAddress(registryRecords.domain.infrastructure, registryRecords.name.rng),
    );
  });

  it('RNG record must be existed', async () => {
    const {
      infrastructure: { contractRegistry },
    } = ctx;
    expect(true).to.eq(
      await contractRegistry.isExistRecord(registryRecords.domain.infrastructure, registryRecords.name.rng),
    );
  });

  it('reversed mapping should be correct', async () => {
    const {
      infrastructure: { contractRNG, contractRegistry },
    } = ctx;
    const [domain, name] = await contractRegistry.getDomainAndName(contractRNG.address);
    expect(domain).to.eq(registryRecords.domain.infrastructure);
    expect(name).to.eq(registryRecords.name.rng);
  });
});
