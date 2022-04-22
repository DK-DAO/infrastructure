import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import hre from 'hardhat';
import { DuelistKingMigration } from '../typechain/DuelistKingMigration';
import BytesBuffer from './helpers/bytes';
import initDuelistKing, { IDeployContext } from './helpers/deployer-duelist-king';
import initInfrastructure from './helpers/deployer-infrastructure';

let context: IDeployContext;
let accounts: SignerWithAddress[];
let boxes: string[] = [];
let cards: string[] = [];
let migration: DuelistKingMigration;

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
  });

  it('owner should able to approve migration contract to transfer all of their token', async () => {
    const {
      duelistKing: { card, item },
      deployer,
      config: { duelistKing },
    } = context;
    const migration = <DuelistKingMigration>(
      await deployer.contractDeploy('Duelist King/DuelistKingMigration', [], card.address, item.address)
    );

    // Migration should be approved for transfer tokens
    await card.connect(accounts[4]).setApprovalForAll(migration.address, true);
    expect(await card.isApprovedForAll(accounts[4].address, migration.address)).to.equal(true);

    // Owner should able to transfer NFTs
    // await migration.connect(accounts[4]).migrateCard([cards[0], cards[1]]);
    // expect(await card.ownerOf(cards[0])).to.equal(migration.address);

    // Owner should able to approve another address to transfer all tokens
    await migration.approveAll(accounts[0].address);
    expect(await card.isApprovedForAll(migration.address, accounts[0].address)).to.equal(true);
  });
});
