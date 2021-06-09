import { expect } from 'chai';
import { buildDigestArray, buildDigest } from './helpers/functions';
import { IInitialResult, init } from './helpers/deployment';
import { keccak256 } from 'js-sha3';

let ctx: IInitialResult;

function dummyDataEncode(signature: string, data: Buffer[]): Buffer {
  const length = 32 * (data.length + 1);
  const functionSignature = Buffer.from(keccak256.create().update(signature).digest()).slice(0, 4);
  const buf = Buffer.alloc(length);
  functionSignature.copy(buf);
  for (let i = 0; i < data.length; i += 1) {
    data[i].copy(buf, (i + 1) * 32);
  }
  return buf;
}

describe('RNG', () => {
  it('OracleProxy should able to forward call from oracle to RNG', async () => {
    ctx = await init();

    const { s, h } = buildDigest();

    await ctx.infrastructure.contractOracleProxy
      .connect(ctx.infrastructure.oracle)
      .safeCall(
        ctx.infrastructure.contractRNG.address,
        0,
        ctx.infrastructure.contractRNG.interface.encodeFunctionData('commit', [h]),
      );

    await ctx.infrastructure.contractOracleProxy
      .connect(ctx.infrastructure.oracle)
      .safeCall(
        ctx.infrastructure.contractRNG.address,
        0,
        ctx.infrastructure.contractRNG.interface.encodeFunctionData('reveal', [
          s,
          '0x0000000000000000000000000000000000000000',
        ]),
      );

    const { revealed, committed } = await ctx.infrastructure.contractRNG.getProgress();

    expect(revealed.toNumber()).to.eq(committed.toNumber());
  });

  it('OracleProxy should able to forward batchCommit call from oracle to RNG', async () => {
    ctx = await init();

    const digests = buildDigestArray(10);

    await ctx.infrastructure.contractOracleProxy
      .connect(ctx.infrastructure.oracle)
      .safeCall(
        ctx.infrastructure.contractRNG.address,
        0,
        ctx.infrastructure.contractRNG.interface.encodeFunctionData('batchCommit', [digests.v]),
      );

    await ctx.infrastructure.contractOracleProxy
      .connect(ctx.infrastructure.oracle)
      .safeCall(
        ctx.infrastructure.contractRNG.address,
        0,
        ctx.infrastructure.contractRNG.interface.encodeFunctionData('reveal', [
          digests.s[0],
          '0x0000000000000000000000000000000000000000',
        ]),
      );

    await ctx.infrastructure.contractOracleProxy
      .connect(ctx.infrastructure.oracle)
      .safeCall(
        ctx.infrastructure.contractRNG.address,
        0,
        ctx.infrastructure.contractRNG.interface.encodeFunctionData('reveal', [
          digests.s[1],
          '0x0000000000000000000000000000000000000000',
        ]),
      );
    const { revealed, committed } = await ctx.infrastructure.contractRNG.getProgress();

    expect(revealed.toNumber()).to.eq(3);
    expect(committed.toNumber()).to.eq(11);
  });
});
