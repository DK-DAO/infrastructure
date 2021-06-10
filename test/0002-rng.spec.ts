import { expect } from 'chai';
import { buildDigestArray, buildDigest } from './helpers/functions';
import { IInitialResult, init } from './helpers/deployment';
import { zeroAddress } from './helpers/const';

let ctx: IInitialResult;

describe('RNG', () => {
  it('OracleProxy should able to forward call from oracle to RNG', async () => {
    ctx = await init();

    const { s, h } = buildDigest();
    const {
      infrastructure: { contractOracleProxy, oracle, contractRNG },
    } = ctx;

    await contractOracleProxy
      .connect(oracle)
      .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('commit', [h]));

    await contractOracleProxy
      .connect(oracle)
      .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('reveal', [s, zeroAddress]));

    const { revealed, committed } = await contractRNG.getProgress();

    expect(revealed.toNumber()).to.eq(committed.toNumber());
  });

  it('OracleProxy should able to forward batchCommit call from oracle to RNG', async () => {
    const digests = buildDigestArray(10);

    const {
      infrastructure: { contractOracleProxy, oracle, contractRNG },
    } = ctx;

    await contractOracleProxy
      .connect(oracle)
      .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('batchCommit', [digests.v]));

    await contractOracleProxy
      .connect(oracle)
      .safeCall(
        contractRNG.address,
        0,
        contractRNG.interface.encodeFunctionData('reveal', [digests.s[0], zeroAddress]),
      );

    await contractOracleProxy
      .connect(oracle)
      .safeCall(
        contractRNG.address,
        0,
        contractRNG.interface.encodeFunctionData('reveal', [
          digests.s[1],
          '0x0000000000000000000000000000000000000000',
        ]),
      );
    const { revealed, committed } = await contractRNG.getProgress();

    expect(revealed.toNumber()).to.eq(3);
    expect(committed.toNumber()).to.eq(11);
  });
});
