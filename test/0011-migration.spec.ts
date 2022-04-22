import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import hre from 'hardhat';
import { DuelistKingToken } from '../typechain';
import { DuelistKingMigration } from '../typechain/DuelistKingMigration';
import BytesBuffer from './helpers/bytes';
import { emptyBytes32, maxUint256, uint, zeroAddress } from './helpers/const';
import initDuelistKing, { IDeployContext } from './helpers/deployer-duelist-king';
import initInfrastructure from './helpers/deployer-infrastructure';
import { dayToSec } from './helpers/functions';

let context: IDeployContext;
let accounts: SignerWithAddress[];
let boxes: string[] = [];
let cards: string[] = [];
let token: DuelistKingToken;

describe.only('DuelistKingMigration', function () {
  this.timeout(5000000);

  this.beforeAll('all initialized should be correct', async () => {
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

    const {
      duelistKing: { card, item, merchant, distributor },
      deployer,
      config: { duelistKing },
    } = context;

    // Deploy test token to buy boxes
    token = <DuelistKingToken>await deployer.contractDeploy('test1/DuelistKingToken', [], accounts[0].address);

    // Create a new sales campaign
    await merchant.connect(accounts[9]).createNewCampaign({
      phaseId: 1,
      totalSale: 20000,
      deadline: Math.round(Date.now() / 1000) + dayToSec(30),
      // It is $5
      basePrice: 5000000,
    });

    // Add deployed token to merchant contract
    await merchant.connect(accounts[9]).manageStablecoin(token.address, 18, true);

    // Transfer token to user 4
    await token.connect(accounts[0]).transfer(accounts[4].address, BigNumber.from(10000).mul(uint));
    await token.connect(accounts[4]).approve(merchant.address, maxUint256);

    // User 4 buy 50 boxes with deployed token
    const txResult = await (await merchant.connect(accounts[4]).buy(0, 50, token.address, emptyBytes32)).wait();

    txResult.logs
      .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)') && e.address === item.address)
      .map((e) => item.interface.decodeEventLog('Transfer', e.data, e.topics))
      .map((e) => {
        const { from, to, tokenId } = e;
        const nftTokenId = BigNumber.from(tokenId).toHexString();
        if (from === zeroAddress) boxes.push(nftTokenId);
        return `Transfer(${[from, to, nftTokenId].join(', ')})`;
      });

    // User 4 open 2 boxes to get some cards
    const packedTokenId = BytesBuffer.newInstance();
    for (let i = 0; i < 2; i += 1) {
      packedTokenId.writeUint256(boxes[i]);
    }
    const txOpenBox = await (await distributor.connect(accounts[4]).openBoxes(packedTokenId.invoke())).wait();
    txOpenBox.logs
      .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
      .map((e) => {
        return item.interface.decodeEventLog('Transfer', e.data, e.topics);
      })
      .map((e) => {
        const { from, to, tokenId } = e;
        const nftTokenId = BigNumber.from(tokenId).toHexString();
        if (from !== zeroAddress) {
          boxes.shift();
        } else {
          cards.push(nftTokenId);
        }
        return `Transfer(${[from, to, nftTokenId].join(', ')})`;
      });
  });

  it('owner should able to approve migration contract to transfer all of their token', async () => {
    const {
      duelistKing: { card, item },
      deployer,
    } = context;
    const migration = <DuelistKingMigration>(
      await deployer.contractDeploy('Duelist King/DuelistKingMigration', [], card.address, item.address)
    );

    // Migration should be approved for transfer tokens
    await card.connect(accounts[4]).setApprovalForAll(migration.address, true);
    expect(await card.isApprovedForAll(accounts[4].address, migration.address)).to.equal(true);

    // Owner should able to transfer NFTs
    await migration.connect(accounts[4]).migrateCard([cards[0], cards[1]]);
    expect(await card.ownerOf(cards[0])).to.equal(migration.address);

    // Owner should able to approve another address to transfer all tokens
    await migration.approveAll(accounts[0].address);
    expect(await card.isApprovedForAll(migration.address, accounts[0].address)).to.equal(true);
  });
});
