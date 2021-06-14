import { expect } from 'chai';
import { getGasCost, buildDigest } from './helpers/functions';
import { IInitialResult, init } from './helpers/deployment';
import crypto from 'crypto';
import { BytesLike } from 'ethers';

let ctx: IInitialResult;
let digests: { s: Buffer[]; h: Buffer[]; v: Buffer };

describe('DuelistKingFairDistributor', function () {
  this.timeout(5000000);

  it('OracleProxy should able to forward newCampaign() call from oracle to DuelistKingFairDistributor', async () => {
    ctx = await init();
    const {
      duelistKing: { contractOracleProxy, contractDuelistKingFairDistributor, oracle },
    } = ctx;
    await contractOracleProxy.connect(oracle).safeCall(
      contractDuelistKingFairDistributor.address,
      0,
      contractDuelistKingFairDistributor.interface.encodeFunctionData('newCampaign', [
        {
          distribution: [
            '0x000000000000000000000001000000060000000000003fff000000000fffffff',
            '0x0000000000000001000000020000000500000000000003ff00000000000fffff',
            '0x00000000000000030000000300000004000000000000007f0000000000003fff',
            '0x00000000000000060000000400000003000000000000003f0000000000000fff',
            '0x000000000000000a0000000500000002000000000000001f00000000000003ff',
            '0x000000000000000f0000000500000001000000000000000f0000000000000000',
          ],
          designs: 20,
          generation: 0,
          start: 0,
        },
      ]),
    );
  });

  it('OracleProxy should able to forward openBox() call from oracle to DuelistKingFairDistributor', async () => {
    ctx = await init();
    const {
      duelistKing: { contractDuelistKingFairDistributor, addressOwner },
    } = ctx;

    const result = await contractDuelistKingFairDistributor.openBox(1, addressOwner, 100, crypto.randomBytes(32));
    expect(result.length).to.eq(100 * 5);
  });

  it('OracleProxy should able to forward reveal call from oracle to RNG and Distributor', async () => {
    const {
      infrastructure: { contractOracleProxy, oracle, contractRNG },
      duelistKing: { contractDuelistKingFairDistributor, addressOwner },
    } = ctx;

    const { s, h } = buildDigest();

    await contractOracleProxy
      .connect(oracle)
      .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('commit', [h]));

    const data = <BytesLike>(
      await contractDuelistKingFairDistributor.constructData(
        s,
        contractDuelistKingFairDistributor.address,
        addressOwner,
        100,
      )
    );

    getGasCost(
      await contractOracleProxy
        .connect(oracle)
        .safeCall(contractRNG.address, 0, contractRNG.interface.encodeFunctionData('reveal', [data]), {
          gasLimit: 10000000,
        }),
    );

    const { revealed, committed } = await contractRNG.getProgress();
    expect(revealed.toNumber()).to.eq(12);
    expect(committed.toNumber()).to.eq(12);
  });
});
