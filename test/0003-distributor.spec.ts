import { expect } from 'chai';
import { getGasCost, contractAt } from './helpers/functions';
import { BytesBuffer } from './helpers/bytes';
import { IInitialResult, init } from './helpers/deployment';
import crypto from 'crypto';
import { BigNumber } from 'ethers';
import { NFT } from '../typechain';
import { getContractFactory } from '@nomiclabs/hardhat-ethers/types';
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
    await contractOracleProxy.connect(oracle).safeCall(
      contractDuelistKingDistributor.address,
      0,
      contractDuelistKingDistributor.interface.encodeFunctionData('newCampaign', [
        {
          opened: 0,
          softCap: 1000000,
          deadline: 0,
          generation: 0,
          start: 0,
          end: 19,
          distribution: [
            '0x00000000000000000000000000000001000000000000000600000000000009c4',
            '0x000000000000000000000000000000020000000100000005000009c400006b6c',
            '0x00000000000000000000000000000003000000030000000400006b6c00043bfc',
            '0x00000000000000000000000000000004000000060000000300043bfc000fadac',
            '0x000000000000000000000000000000050000000a00000002000fadac0026910c',
            '0x000000000000000000000000000000050000000f000000010026910c004c4b40',
          ],
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
      console.log(
        `\t [${l.address}]\t${await contractNFT.name()}::${name}(${[to, BigNumber.from(tokenId).toHexString()].join(
          ',',
        )})`,
      );
    }
  });

  it('OracleProxy should able to forward issueGenesis() call from oracle to DuelistKingDistributor', async () => {
    ctx = await init();
    const {
      infrastructure: { contractNFT },
      duelistKing: { contractDuelistKingDistributor, addressOwner, contractOracleProxy, oracle },
    } = ctx;
    const tx = await contractOracleProxy
      .connect(oracle)
      .safeCall(
        contractDuelistKingDistributor.address,
        0,
        contractDuelistKingDistributor.interface.encodeFunctionData('issueGenesisEdittion', [addressOwner, 0]),
      );
    const txReceipt = await tx.wait();
    const logs = txReceipt.logs.filter(
      (l) => ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'].indexOf(l.topics[0]) >= 0,
    );
    const {
      args: { tokenId },
    } = contractNFT.interface.parseLog(logs[0]);

    console.log('\tTotal supply:', (await contractNFT.totalSupply()).toString());
    console.log('\tToken URI:', await contractNFT.tokenURI(tokenId));

    for (let i = 0; i < logs.length; i += 1) {
      const l = logs[i];
      const {
        args: { to, tokenId },
        name,
      } = contractNFT.interface.parseLog(l);
      console.log(
        `\t [${l.address}]\t${await contractNFT.name()}::${name}(${[to, BigNumber.from(tokenId).toHexString()].join(
          ',',
        )})`,
      );
    }
  });
});
