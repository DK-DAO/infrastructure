import { expect } from 'chai';
import { buildDigestArray, buildDigest } from './helpers/functions';
import { IInitialResult, init } from './helpers/deployment';
import { zeroAddress } from './helpers/const';
import { BytesLike } from 'ethers';

let ctx: IInitialResult;
let digests: { s: Buffer[]; h: Buffer[]; v: Buffer };

describe('RNG', () => {
  it('OracleProxy should able to forward call from oracle to RNG', async () => {
    ctx = await init();

    const { s, h } = buildDigest();
    const {
      infrastructure: { contractOracleProxy, oracle, contractRNG },
      duelistKing: { contractDuelistKingFairDistributor, addressOwner },
    } = ctx;

    await contractOracleProxy
      .connect(oracle)
      .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('commit', [h]));

    const data = <BytesLike>await contractDuelistKingFairDistributor.constructData(s, zeroAddress, addressOwner, 100);
    await contractOracleProxy
      .connect(oracle)
      .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('reveal', [data]));

    const { revealed, committed } = await contractRNG.getProgress();

    expect(revealed.toNumber()).to.eq(committed.toNumber());
  });

  it('OracleProxy should able to forward batchCommit call from oracle to RNG', async () => {
    digests = buildDigestArray(10);

    const {
      infrastructure: { contractOracleProxy, oracle, contractRNG },
      duelistKing: { contractDuelistKingFairDistributor, addressOwner },
    } = ctx;

    await contractOracleProxy
      .connect(oracle)
      .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('batchCommit', [digests.v]));

    for (let i = 0; i < digests.s.length; i += 1) {
      const data = <BytesLike>(
        await contractDuelistKingFairDistributor.constructData(digests.s[i], zeroAddress, addressOwner, 100)
      );

      await contractOracleProxy
        .connect(oracle)
        .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('reveal', [data]));
    }
    const { revealed, committed } = await contractRNG.getProgress();

    expect(revealed.toNumber()).to.eq(11);
    expect(committed.toNumber()).to.eq(11);
  });
});
