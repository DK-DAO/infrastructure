import hre from 'hardhat';
import { BigNumber, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { zeroAddress } from './helpers/const';
import initInfrastructure from './helpers/deployer-infrastructure';
import initDuelistKing, { IDeployContext } from './helpers/deployer-duelist-king';
import { craftProof } from './helpers/functions';
import BytesBuffer from './helpers/bytes';
import Card from './helpers/card';
import { expect } from 'chai';

let context: IDeployContext;
let accounts: SignerWithAddress[];
let boxes: string[] = [];
let openedBoxes: string[] = [];

describe('DuelistKingDistributor', function () {
  this.timeout(5000000);

  it('all initialized should be correct', async () => {
    accounts = await hre.ethers.getSigners();
    context = await initDuelistKing(
      await initInfrastructure(hre, {
        network: hre.network.name,
        infrastructure: {
          operator: accounts[0],
          oracles: [accounts[1]],
        },
        duelistKing: {
          operator: accounts[2],
          oracles: [accounts[3]],
        },
      }),
    );
  });

  it('OracleProxy should able to forward mintBoxes() phase 1 from real oracle to DuelistKingDistributor', async () => {
    const {
      infrastructure: { nft },
      duelistKing: { distributor, oracle },
      config: { duelistKing },
    } = context;

    const txResult = await (
      await oracle
        .connect(accounts[8])
        .safeCall(
          await craftProof(await hre.ethers.getSigner(duelistKing.oracleAddresses[0]), oracle),
          distributor.address,
          0,
          distributor.interface.encodeFunctionData('mintBoxes', [accounts[4].address, 100, 1]),
        )
    ).wait();

    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
        .map((e) => nft.interface.decodeEventLog('Transfer', e.data, e.topics))
        .map((e) => {
          const { from, to, tokenId } = e;
          const nftTokenId = BigNumber.from(tokenId).toHexString();
          const card = Card.from(nftTokenId);
          expect(card.getApplicationId()).to.eq(0n);
          if (from === zeroAddress) boxes.push(nftTokenId);
          return `Transfer(${[from, to, nftTokenId].join(', ')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
  });

  it('owner should able to open their boxes', async () => {
    const {
      infrastructure: { nft },
      duelistKing: { distributor },
    } = context;
    const packedTokenId = BytesBuffer.newInstance();
    for (let i = 0; i < boxes.length; i += 1) {
      packedTokenId.writeUint256(boxes[i]);
    }

    const txResult = await (await distributor.connect(accounts[4]).openBoxes(packedTokenId.invoke())).wait();
    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
        .map((e) => {
          return nft.interface.decodeEventLog('Transfer', e.data, e.topics);
        })
        .map((e) => {
          const { from, to, tokenId } = e;
          const nftTokenId = BigNumber.from(tokenId).toHexString();
          if (from === zeroAddress) {
            const card = Card.from(nftTokenId);
            expect(card.getApplicationId()).to.not.eq(0n);
            openedBoxes.push(nftTokenId);
          } else {
            boxes.pop();
          }
          return `Transfer(${[from, to, nftTokenId].join(', ')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
  });

  it('anyone could able to claim cards for owner', async () => {
    const {
      infrastructure: { nft },
      duelistKing: { distributor },
    } = context;
    const packedTokenId = BytesBuffer.newInstance();
    for (let i = 0; i < openedBoxes.length; i += 1) {
      packedTokenId.writeUint256(openedBoxes[i]);
    }
    const txResult = await (
      await distributor.connect(accounts[5]).claimCards(accounts[4].address, packedTokenId.invoke())
    ).wait();
    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
        .map((e) => {
          return nft.interface.decodeEventLog('Transfer', e.data, e.topics);
        })
        .map((e) => {
          const { from, to, tokenId } = e;
          const nftTokenId = BigNumber.from(tokenId).toHexString();
          const card = Card.from(nftTokenId);
          if (card.getType() === 0 && card.getId() >= 20) {
            throw new Error('Invalid card id phase 1');
          }
          if (from !== zeroAddress) {
            openedBoxes.pop();
          }
          return `Transfer(${[from, to, nftTokenId].join(', ')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
  });

  it('OracleProxy should able to forward mintBoxes() phase 20 from real oracle to DuelistKingDistributor', async () => {
    const {
      infrastructure: { nft },
      duelistKing: { distributor, oracle },
      config: { duelistKing },
    } = context;
    expect(boxes.length).to.eq(0);
    expect(openedBoxes.length).to.eq(0);
    const txResult = await (
      await oracle
        .connect(accounts[8])
        .safeCall(
          await craftProof(await hre.ethers.getSigner(duelistKing.oracleAddresses[0]), oracle),
          distributor.address,
          0,
          distributor.interface.encodeFunctionData('mintBoxes', [accounts[4].address, 100, 20]),
        )
    ).wait();

    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
        .map((e) => nft.interface.decodeEventLog('Transfer', e.data, e.topics))
        .map((e) => {
          const { from, to, tokenId } = e;
          if (from === zeroAddress) boxes.push(BigNumber.from(tokenId).toHexString());
          return `Transfer(${[from, to, BigNumber.from(tokenId).toHexString()].join(', ')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
  });

  it('owner should able to open their boxes', async () => {
    const {
      infrastructure: { nft },
      duelistKing: { distributor },
    } = context;
    const packedTokenId = BytesBuffer.newInstance();
    for (let i = 0; i < boxes.length; i += 1) {
      packedTokenId.writeUint256(boxes[i]);
    }

    const txResult = await (await distributor.connect(accounts[4]).openBoxes(packedTokenId.invoke())).wait();
    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
        .map((e) => {
          return nft.interface.decodeEventLog('Transfer', e.data, e.topics);
        })
        .map((e) => {
          const { from, to, tokenId } = e;
          if (from === zeroAddress) openedBoxes.push(BigNumber.from(tokenId).toHexString());
          return `Transfer(${[from, to, BigNumber.from(tokenId).toHexString()].join(', ')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
  });

  it('anyone could able to claim cards for owner', async () => {
    const {
      deployer,
      infrastructure: { nft },
      duelistKing: { distributor },
    } = context;
    const packedTokenId = BytesBuffer.newInstance();
    for (let i = 0; i < openedBoxes.length; i += 1) {
      packedTokenId.writeUint256(openedBoxes[i]);
    }
    const txResult = await (
      await distributor.connect(accounts[5]).claimCards(accounts[4].address, packedTokenId.invoke())
    ).wait();
    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
        .map((e) => {
          return nft.interface.decodeEventLog('Transfer', e.data, e.topics);
        })
        .map((e) => {
          const { from, to, tokenId } = e;
          const nftTokenId = BigNumber.from(tokenId).toHexString();
          const card = Card.from(nftTokenId);
          if (card.getType() === 0 && card.getId() < 380n && card.getId() >= 400n) {
            throw new Error(`Invalid card id phase 20 ${nftTokenId}`);
          }
          return `Transfer(${[from, to, nftTokenId].join(', ')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
    deployer.printReport();
  });

  it('OracleProxy should able to forward issueGenesisCard() DuelistKingDistributor', async () => {
    const {
      infrastructure: { nft },
      duelistKing: { distributor, oracle },
      config: { duelistKing },
    } = context;
    boxes = [];
    openedBoxes = [];
    const txResult = await (
      await oracle
        .connect(accounts[8])
        .safeCall(
          await craftProof(await hre.ethers.getSigner(duelistKing.oracleAddresses[0]), oracle),
          distributor.address,
          0,
          distributor.interface.encodeFunctionData('issueGenesisCard', [accounts[4].address, 400]),
        )
    ).wait();

    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
        .map((e) => nft.interface.decodeEventLog('Transfer', e.data, e.topics))
        .map((e) => {
          const { from, to, tokenId } = e;
          const nftTokenId = BigNumber.from(tokenId).toHexString();
          const card = Card.from(nftTokenId);
          expect(card.getEdition()).to.eq(0xffff);
          expect(card.getId()).to.eq(400n);
          expect(card.getGeneration()).to.eq(1);
          expect(card.getRareness()).to.eq(0);
          expect(card.getType()).to.eq(0);
          if (from === zeroAddress) boxes.push(nftTokenId);
          return `Transfer(${[from, to, nftTokenId].join(', ')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
  });
});
