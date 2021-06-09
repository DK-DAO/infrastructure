import { expect } from 'chai';
import { IInitialResult, init } from './helpers/deployment';
import { registryRecords } from './helpers/const';

let ctx: IInitialResult;

describe('Registry', () => {
  it('account[0] must be the owner of registry', async () => {
    ctx = await init();
    expect(await ctx.infrastructure.contractRegistry.owner()).to.eq(await ctx.infrastructure.owner.getAddress());
  });

  it('Oracle in registry should be OracleProxy', async () => {
    expect(ctx.infrastructure.contractOracleProxy.address).to.eq(
      await ctx.infrastructure.contractRegistry.getAddress(
        registryRecords.domain.infrastructure,
        registryRecords.name.oracle,
      ),
    );
  });

  it('Press in registry should be Press', async () => {
    expect(ctx.infrastructure.contractPress.address).to.eq(
      await ctx.infrastructure.contractRegistry.getAddress(
        registryRecords.domain.infrastructure,
        registryRecords.name.press,
      ),
    );
  });

  it('NFT in registry should be NFT', async () => {
    expect(ctx.infrastructure.contractNFT.address).to.eq(
      await ctx.infrastructure.contractRegistry.getAddress(
        registryRecords.domain.infrastructure,
        registryRecords.name.nft,
      ),
    );
  });

  it('RNG in registry should be RNG', async () => {
    expect(ctx.infrastructure.contractRNG.address).to.eq(
      await ctx.infrastructure.contractRegistry.getAddress(
        registryRecords.domain.infrastructure,
        registryRecords.name.rng,
      ),
    );
  });

  it('RNG record must be existed', async () => {
    expect(true).to.eq(
      await ctx.infrastructure.contractRegistry.isExistRecord(
        registryRecords.domain.infrastructure,
        registryRecords.name.rng,
      ),
    );
  });

  it('reversed mapping should be correct', async () => {
    const [domain, name] = await ctx.infrastructure.contractRegistry.getDomainAndName(
      ctx.infrastructure.contractRNG.address,
    );
    expect(domain).to.eq(registryRecords.domain.infrastructure);
    expect(name).to.eq(registryRecords.name.rng);
  });
});
