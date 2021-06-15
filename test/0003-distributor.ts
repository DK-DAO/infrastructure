import { expect } from 'chai';
import { getGasCost } from './helpers/functions';
import { BytesBuffer } from './helpers/bytes';
import { IInitialResult, init } from './helpers/deployment';
import crypto from 'crypto';
import { BigNumber } from 'ethers';

let ctx: IInitialResult;
let digests: { s: Buffer[]; h: Buffer[]; v: Buffer };
const cards = [];

describe('DuelistKingDistributor', function () {
  this.timeout(5000000);

  it('OracleProxy should able to forward newCampaign() call from oracle to DuelistKingDistributor', async () => {
    ctx = await init();
    const {
      duelistKing: { contractOracleProxy, contractDuelistKingDistributor, oracle },
    } = ctx;
    for (let i = 1; i <= 20; i++) {
      const tx = await contractOracleProxy
        .connect(oracle)
        .safeCall(
          contractDuelistKingDistributor.address,
          0,
          contractDuelistKingDistributor.interface.encodeFunctionData('issueCard', [`Card ${i}`, `DKC ${i}`]),
        );

      console.log((await tx.wait()).logs)
    }
  });

  it('OracleProxy should able to forward newCampaign() call from oracle to DuelistKingDistributor', async () => {
    ctx = await init();
    const {
      duelistKing: { contractOracleProxy, contractDuelistKingDistributor, oracle },
    } = ctx;
    await contractOracleProxy.connect(oracle).safeCall(
      contractDuelistKingDistributor.address,
      0,
      contractDuelistKingDistributor.interface.encodeFunctionData('newCampaign', [
        {
          distribution: [
            '0x000000000000000000000000000000010000000000003fff000000000fffffff',
            '0x0000000000000001000000000000000200000000000003ff00000000000fffff',
            '0x00000000000000030000000000000003000000000000007f0000000000003fff',
            '0x00000000000000060000000000000004000000000000003f0000000000000fff',
            '0x000000000000000a0000000000000005000000000000001f00000000000003ff',
            '0x000000000000000f0000000000000005000000000000000f0000000000000000',
          ],
          opened: 0,
          softCap: 1000000,
          deadline: 0,
          generation: 0,
          start: 1,
          end: 21,
          designs: 20,
        },
      ]),
    );
  });

  it('OracleProxy should able to forward openBox() call from oracle to DuelistKingDistributor', async () => {
    ctx = await init();
    const {
      infrastructure: { contractNFT },
      duelistKing: { contractDuelistKingDistributor, addressOwner, contractOracleProxy, oracle },
    } = ctx;
    for (let i = 0; i < 100; i++) {
      const result = await contractOracleProxy
        .connect(oracle)
        .safeCall(
          contractDuelistKingDistributor.address,
          0,
          contractDuelistKingDistributor.interface.encodeFunctionData('openBox', [1, addressOwner, 10]),
        );
      const txReceipt = await result.wait();
      console.log('\tGas used:', BigNumber.from(txReceipt.gasUsed).toString(), 'Gas');
      txReceipt.logs
        .filter((l) => ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'].indexOf(l.topics[0]) >= 0)
        .forEach((l) => {
          const {
            args: { from, to, tokenId },
            name,
          } = contractNFT.interface.parseLog(l);
          console.log(`\t${name}(${[from, to, BigNumber.from(tokenId).toHexString()].join(',')})`);
        });
    }
  });
});
