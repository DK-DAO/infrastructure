import { expect } from 'chai';
import { buildDigestArray, buildDigest } from './helpers/functions';
import { IInitialResult, init } from './helpers/deployment';
import { BytesBuffer } from './helpers/bytes';
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
      duelistKing: { contractDuelistKingDistributor, addressOwner },
    } = ctx;

    await contractOracleProxy
      .connect(oracle)
      .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('commit', [h]));

    const data: BytesLike = BytesBuffer.newInstance()
      .writeAddress(zeroAddress)
      .writeUint256('0x01')
      .writeUint256(s)
      .invoke();
    await contractOracleProxy
      .connect(oracle)
      .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('reveal', [data]));

    const { remaining } = await contractRNG.getProgess();

    expect(remaining.toNumber()).to.eq(0);
  });

  it('OracleProxy should able to forward batchCommit call from oracle to RNG', async () => {
    digests = buildDigestArray(10);

    const {
      infrastructure: { contractOracleProxy, oracle, contractRNG },
      duelistKing: { contractDuelistKingDistributor, addressOwner },
    } = ctx;

    await contractOracleProxy
      .connect(oracle)
      .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('batchCommit', [digests.v]));
    for (let i = 0; i < digests.s.length; i += 1) {
      const data: BytesLike = BytesBuffer.newInstance()
        .writeAddress(contractDuelistKingDistributor.address)
        .writeUint256(`0x${(2 + i).toString(16).padStart(8, '0')}`)
        .writeUint256(digests.s[i])
        .invoke();
      await contractOracleProxy
        .connect(oracle)
        .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('reveal', [data]));
    }
    const { remaining } = await contractRNG.getProgess();
    expect(remaining.toNumber()).to.eq(0);
  });
});
