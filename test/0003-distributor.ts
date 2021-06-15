import { expect } from 'chai';
import { getGasCost } from './helpers/functions';
import { BytesBuffer } from './helpers/bytes';
import { IInitialResult, init } from './helpers/deployment';
import crypto from 'crypto';
import { BigNumber } from 'ethers';

let ctx: IInitialResult;
let digests: { s: Buffer[]; h: Buffer[]; v: Buffer };

describe('DuelistKingNFT', function () {
  this.timeout(5000000);

  it('OracleProxy should able to forward newCampaign() call from oracle to DuelistKingNFT', async () => {
    ctx = await init();
    const {
      duelistKing: { contractOracleProxy, contractDuelistKingNFT, oracle },
    } = ctx;
    await contractOracleProxy.connect(oracle).safeCall(
      contractDuelistKingNFT.address,
      0,
      contractDuelistKingNFT.interface.encodeFunctionData('newCampaign', [
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
          opened: 0,
          softCap: 1000000,
          deadline: 0,
        },
      ]),
    );
  });

  it('OracleProxy should able to forward openBox() call from oracle to DuelistKingNFT', async () => {
    ctx = await init();
    const {
      duelistKing: { contractDuelistKingNFT, addressOwner, contractOracleProxy, oracle },
    } = ctx;
    
    const result = await contractOracleProxy
      .connect(oracle)
      .safeCall(
        contractDuelistKingNFT.address,
        0,
        contractDuelistKingNFT.interface.encodeFunctionData('openBox', [1, addressOwner, 10]),
      );
    const txReceipt = await result.wait();
    console.log('\tGas used:', BigNumber.from(txReceipt.gasUsed).toString(), 'Gas');

    txReceipt.logs
      .filter((l) => ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'].indexOf(l.topics[0]) >= 0)
      .forEach((l) => {
        const {
          args: { from, to, tokenId },
          name,
        } = contractDuelistKingNFT.interface.parseLog(l);
        console.log(`\t${name}(${[from, to, BigNumber.from(tokenId).toHexString()].join(',')})`);
      });
  });
});
