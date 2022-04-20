import hre from 'hardhat';
import { randomBytes } from 'crypto';
import { BigNumber, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { zeroAddress } from './helpers/const';
import initInfrastructure from './helpers/deployer-infrastructure';
import initDuelistKing, { IDeployContext } from './helpers/deployer-duelist-king';
import { craftProof, dayToSec, getUint128Random, printAllEvents } from './helpers/functions';
import BytesBuffer from './helpers/bytes';
import Card from './helpers/card';
import { expect } from 'chai';
import { DuelistKingToken, NFT } from '../typechain';

let context: IDeployContext;
let accounts: SignerWithAddress[];
let boxes: string[] = [];
let cards: string[] = [];
let token: DuelistKingToken;
let uint = '1000000000000000000';
const emptyBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
const maxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

describe('DuelistKingDistributor', function () {
  this.timeout(5000000);

  it('all initialized should be correct', async () => {
    accounts = await hre.ethers.getSigners();
    context = await initDuelistKing(
      await initInfrastructure(hre, {
        network: hre.network.name,
        salesAgent: accounts[9],
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

  it('Sales Agents must able to create new campaign', async () => {
    const {
      duelistKing: { merchant },
      deployer,
    } = context;
    // Deploy token to buy boxes
    token = <DuelistKingToken>await deployer.contractDeploy('test1/DuelistKingToken', [], accounts[0].address);

    // Transfer token to buyer
    await token.connect(accounts[0]).transfer(accounts[4].address, BigNumber.from(10000).mul(uint));

    // Create campaign for phase 1
    printAllEvents(
      await merchant.connect(accounts[9]).createNewCampaign({
        phaseId: 1,
        totalSale: 20000,
        deadline: Math.round(Date.now() / 1000) + dayToSec(30),
        // It is $5
        basePrice: 5000000,
      }),
    );

    // Create campaign for phase 20
    printAllEvents(
      await merchant.connect(accounts[9]).createNewCampaign({
        phaseId: 20,
        totalSale: 20000,
        deadline: Math.round(Date.now() / 1000) + dayToSec(30),
        // It is $5
        basePrice: 5000000,
      }),
    );

    printAllEvents(await merchant.connect(accounts[9]).manageStablecoin(token.address, 18, true));
  });

  it('Any one would able to buy box from DuelistKingMerchant', async () => {
    const {
      duelistKing: { merchant, item },
    } = context;
    // Approve token transfer
    await token.connect(accounts[4]).approve(merchant.address, maxUint256);
    const txResult = await (await merchant.connect(accounts[4]).buy(0, 50, token.address, emptyBytes32)).wait();

    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)') && e.address === item.address)
        .map((e) => item.interface.decodeEventLog('Transfer', e.data, e.topics))
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
      duelistKing: { distributor, item },
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
          return item.interface.decodeEventLog('Transfer', e.data, e.topics);
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

  it('Owner should be able to buy phase 20 boxes from DuelistKingDistributor', async () => {
    const {
      duelistKing: { merchant, item },
    } = context;
    const txResult = await (await merchant.connect(accounts[4]).buy(0, 50, token.address, emptyBytes32)).wait();

    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)') && e.address === item.address)
        .map((e) => item.interface.decodeEventLog('Transfer', e.data, e.topics))
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
      duelistKing: { distributor, item },
    } = context;
    const packedTokenId = BytesBuffer.newInstance();
    for (let i = 0; i < boxes.length; i += 1) {
      packedTokenId.writeUint256(boxes[i]);
    }

    const txResult = await (await distributor.connect(accounts[4]).openBoxes(packedTokenId.invoke())).wait();
    const txTransferLogs = txResult.logs
      .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
      .map((e) => {
        return item.interface.decodeEventLog('Transfer', e.data, e.topics);
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
    const {
      duelistKing: { item, card },
    } = context;
    expect((await item.balanceOf(accounts[4].address)).toNumber()).to.eq(0);
    expect((await item.totalSupply()).toNumber()).to.eq(0);
    expect((await card.balanceOf(accounts[4].address)).toNumber()).to.gt(0);
    expect((await card.totalSupply()).toNumber()).to.eq((await card.balanceOf(accounts[4].address)).toNumber());
  });

  it('OracleProxy should able to forward issueGenesisCard() DuelistKingDistributor', async () => {
    const {
      duelistKing: { distributor, oracle, card },
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
        .map((e) => card.interface.decodeEventLog('Transfer', e.data, e.topics))
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
      duelistKing: { distributor, oracle, card },
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
        .map((e) => card.interface.decodeEventLog('Transfer', e.data, e.topics))
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
      duelistKing: { distributor, oracle, card },
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
          distributor.interface.encodeFunctionData('upgradeCard', [cards[0], 500000000]),
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
          const { from, to, tokenId } = card.interface.decodeEventLog('Transfer', e.data, e.topics);
          return `Transfer(${[from, to, tokenId.toHexString()].join(',')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
  });
});
