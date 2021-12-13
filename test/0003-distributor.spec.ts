import hre from 'hardhat';
import { randomBytes } from 'crypto';
import { BigNumber, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { zeroAddress } from './helpers/const';
import initInfrastructure from './helpers/deployer-infrastructure';
import initDuelistKing, { IDeployContext } from './helpers/deployer-duelist-king';
import { craftProof, getUint128Random } from './helpers/functions';
import BytesBuffer from './helpers/bytes';
import Card from './helpers/card';
import { expect } from 'chai';
import { NFT } from '../typechain';

let context: IDeployContext;
let accounts: SignerWithAddress[];
let boxes: string[] = [];
let cards: string[] = [];

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
          distributor.interface.encodeFunctionData('mintBoxes', [accounts[4].address, 50, 1]),
        )
    ).wait();

    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
        .map((e) => nft.interface.decodeEventLog('Transfer', e.data, e.topics))
        .map((e) => {
          const { from, to, tokenId } = e;
          const nftTokenId = BigNumber.from(tokenId).toHexString();
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
          if (from !== zeroAddress) {
            boxes.pop();
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
    const txResult = await (
      await oracle
        .connect(accounts[8])
        .safeCall(
          await craftProof(await hre.ethers.getSigner(duelistKing.oracleAddresses[0]), oracle),
          distributor.address,
          0,
          distributor.interface.encodeFunctionData('mintBoxes', [accounts[4].address, 50, 20]),
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
    const txTransferLogs = txResult.logs
      .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
      .map((e) => {
        return nft.interface.decodeEventLog('Transfer', e.data, e.topics);
      });
    cards = [...txTransferLogs.map((e) => e.tokenId)];
    console.log(
      txTransferLogs
        .map((e) => {
          const { from, to, tokenId } = e;
          return `Transfer(${[from, to, BigNumber.from(tokenId).toHexString()].join(', ')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
  });

  it('OracleProxy should able to forward issueGenesisCard() DuelistKingDistributor', async () => {
    const { deployer } = context;
    const nftItem = <NFT>(
      await deployer.contractAttach('Duelist King/NFT', await deployer.getAddressInRegistry('Duelist King', 'NFT Item'))
    );
    expect((await nftItem.balanceOf(accounts[4].address)).toNumber()).to.eq(0);
    expect((await nftItem.totalSupply()).toNumber()).to.eq(0);
    const nftCard = <NFT>(
      await deployer.contractAttach('Duelist King/NFT', await deployer.getAddressInRegistry('Duelist King', 'NFT Card'))
    );
    expect((await nftCard.balanceOf(accounts[4].address)).toNumber()).to.gt(0);
    expect((await nftCard.totalSupply()).toNumber()).to.eq((await nftCard.balanceOf(accounts[4].address)).toNumber());
  });

  it('OracleProxy should able to forward issueGenesisCard() DuelistKingDistributor', async () => {
    const {
      infrastructure: { nft },
      duelistKing: { distributor, oracle },
      config: { duelistKing },
    } = context;
    boxes = [];
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

  it('OracleProxy should able to forward mintBoxes() phase 2 from real oracle to DuelistKingDistributor', async () => {
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
          distributor.interface.encodeFunctionData('mintBoxes', [accounts[4].address, 100, 2]),
        )
    ).wait();

    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
        .map((e) => nft.interface.decodeEventLog('Transfer', e.data, e.topics))
        .map((e) => {
          const { from, to, tokenId } = e;
          const nftTokenId = BigNumber.from(tokenId).toHexString();
          if (from === zeroAddress) boxes.push(nftTokenId);
          return `Transfer(${[from, to, nftTokenId].join(', ')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
  });

  it('OracleProxy should able to forward upgradeCard() to DuelistKingDistributor', async () => {
    const {
      infrastructure: { nft },
      duelistKing: { distributor, oracle },
      config: { duelistKing },
    } = context;
    boxes = [];
    const txResult = await (
      await oracle
        .connect(accounts[8])
        .safeCall(
          await craftProof(await hre.ethers.getSigner(duelistKing.oracleAddresses[0]), oracle),
          distributor.address,
          0,
          distributor.interface.encodeFunctionData('upgradeCard', [cards[0], randomBytes(32), 500000000]),
        )
    ).wait();

    console.log(
      txResult.logs
        .filter((e) =>
          [
            utils.id('Transfer(address,address,uint256)'),
            utils.id('CardUpgradeFailed(address,uint256)'),
            utils.id('CardUpgradeSuccessful(address,uint256,uint256)'),
          ].includes(e.topics[0]),
        )
        .map((e) => {
          if (e.topics[0] === utils.id('CardUpgradeFailed(address,uint256)')) {
            const { owner, oldCardId } = distributor.interface.decodeEventLog('CardUpgradeFailed', e.data, e.topics);
            return `CardUpgradeFailed(${[owner, oldCardId.toHexString()].join(',')})`;
          } else if (e.topics[0] === utils.id('CardUpgradeSuccessful(address,uint256,uint256)')) {
            const { owner, oldCardId, newCardId } = distributor.interface.decodeEventLog(
              'CardUpgradeSuccessful',
              e.data,
              e.topics,
            );
            return `CardUpgradeSuccessful${[owner, oldCardId.toHexString(), newCardId.toHexString()].join(',')}`;
          }
          const { from, to, tokenId } = nft.interface.decodeEventLog('Transfer', e.data, e.topics);
          return `Transfer(${[from, to, tokenId.toHexString()].join(',')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
  });
});
