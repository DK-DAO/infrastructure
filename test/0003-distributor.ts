import { expect } from 'chai';
import { getGasCost, contractAt } from './helpers/functions';
import { BytesBuffer } from './helpers/bytes';
import { IInitialResult, init } from './helpers/deployment';
import crypto from 'crypto';
import { BigNumber } from 'ethers';
import { NFT } from '../typechain';
import { getContractFactory } from '@nomiclabs/hardhat-ethers/types';
const card2: any = {};
let ctx: IInitialResult;
let digests: { s: Buffer[]; h: Buffer[]; v: Buffer };
const cards = [];

describe('DuelistKingDistributor', function () {
  this.timeout(5000000);

  it('OracleProxy should able to forward issueCard() from oracle to DuelistKingDistributor', async () => {
    ctx = await init();
    const {
      duelistKing: { contractOracleProxy, contractDuelistKingDistributor, oracle },
    } = ctx;
    for (let i = 1; i <= 20; i++) {
      await contractOracleProxy
        .connect(oracle)
        .safeCall(
          contractDuelistKingDistributor.address,
          0,
          contractDuelistKingDistributor.interface.encodeFunctionData('issueCard', [`Card ${i}`, `DKC ${i}`]),
        );
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
            '0x000000000000000000000000000000010000000000001fff0000000000ffffff',
            '0x00000000000000010000000000000002000000000000ffff0000000000ffffff',
            '0x00000000000000030000000000000003000000000007ffff0000000000ffffff',
            '0x0000000000000006000000000000000400000000000fffff0000000000ffffff',
            '0x000000000000000a000000000000000500000000003fffff0000000000ffffff',
            '0x000000000000000f000000000000000500000000ffffffff0000000000ffffff',
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
    const result = await contractOracleProxy
      .connect(oracle)
      .safeCall(
        contractDuelistKingDistributor.address,
        0,
        contractDuelistKingDistributor.interface.encodeFunctionData('openBox', [1, addressOwner, 10]),
        {
          gasLimit: 3000000,
        },
      );
    const txReceipt = await result.wait();
    console.log('\tGas used:', BigNumber.from(txReceipt.gasUsed).toString(), 'Gas');
    const logs = txReceipt.logs.filter(
      (l) => ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'].indexOf(l.topics[0]) >= 0,
    );
    for (let i = 0; i < logs.length; i += 1) {
      const l = logs[i];
      const {
        args: { to, tokenId },
        name,
      } = contractNFT.interface.parseLog(l);
      const cNft = <NFT>await contractAt('NFT', l.address);
      const n = await cNft.name();
      card2[n] = typeof card2[n] === 'undefined' ? 1 : card2[n] + 1;
      console.log(
        `\t [${l.address}]\t${await cNft.name()}::${name}(${[to, BigNumber.from(tokenId).toHexString()].join(',')})`,
      );
    }
  });
});
