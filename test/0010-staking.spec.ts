import chai, { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { TestToken } from '../typechain';
import { solidity } from 'ethereum-waffle';
import Deployer from './helpers/deployer';
import initDuelistKing, { IDeployContext } from './helpers/deployer-duelist-king';
import initInfrastructure from './helpers/deployer-infrastructure';

chai.use(solidity);

let stakingContract: any, contractTestToken: TestToken;
let user1: any, user2: any, user3: any;
let context: IDeployContext;

function dayToSec(days: number) {
  return Math.round(days * 86400);
}

async function timeTravel(secs: number) {
  await hre.network.provider.request({
    method: 'evm_increaseTime',
    params: [secs],
  });
  await hre.network.provider.request({
    method: 'evm_mine',
    params: [],
  });
}

describe.only('Staking', function () {
  this.beforeAll('Before init', async function () {
    const accounts = await ethers.getSigners();
    const deployer: Deployer = Deployer.getInstance(hre);

    contractTestToken = <TestToken>await deployer.connect(accounts[0]).contractDeploy('test/TestToken', []);

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

  it('Initialize', async function () {
    const accounts = await ethers.getSigners();
    const {
      duelistKing: { duelistKingStaking },
      config: { duelistKing },
    } = context;
    stakingContract = duelistKingStaking;
    user1 = accounts[4];
    user2 = accounts[5];
    user3 = accounts[6];
  });

  it('should be failed when create a new campaign because token address is not a smart contract', async function () {
    const blocktime = await stakingContract.getBlockTime();
    const accounts = await ethers.getSigners();
    const config = {
      startDate: blocktime.add(Math.round(1 * 86400)),
      endDate: blocktime.add(Math.round(30 * 86400)),
      returnRate: 1,
      maxAmountOfToken: 4000000,
      stakedAmountOfToken: 0,
      limitStakingAmountForUser: 500,
      tokenAddress: accounts[1].address,
      maxNumberOfBoxes: 32000,
      rewardPhaseBoxId: 3,
      numberOfLockDays: 15,
    };

    await expect(stakingContract.createNewStakingCampaign(config)).to.be.revertedWith(
      'StakingContract: Token address is not a smart contract',
    );
  });

  it('should be failed because of non onwner creating a new campaign', async function () {
    const blocktime = await stakingContract.getBlockTime();
    const accounts = await ethers.getSigners();
    const config = {
      startDate: blocktime.add(Math.round(1 * 86400)),
      endDate: blocktime.add(Math.round(30 * 86400)),
      returnRate: 1,
      maxAmountOfToken: 4000000,
      stakedAmountOfToken: 0,
      limitStakingAmountForUser: 500,
      tokenAddress: contractTestToken.address,
      maxNumberOfBoxes: 32000,
      rewardPhaseBoxId: 3,
      numberOfLockDays: 15,
    };

    await expect(stakingContract.connect(accounts[3]).createNewStakingCampaign(config)).to.be.revertedWith(
      'UserRegistry: Only allow call from same domain',
    );
  });

  it('should return campaign something when created', async function () {
    const blocktime = await stakingContract.getBlockTime();
    const config = {
      startDate: blocktime.add(dayToSec(1)),
      endDate: blocktime.add(dayToSec(31)),
      returnRate: 1,
      maxAmountOfToken: 400000,
      stakedAmountOfToken: 0,
      limitStakingAmountForUser: 500,
      tokenAddress: contractTestToken.address,
      maxNumberOfBoxes: 32000,
      rewardPhaseBoxId: 3,
      numberOfLockDays: 15,
    };

    const r = await (await stakingContract.createNewStakingCampaign(config)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'NewCampaign');
    expect(filteredEvents.length).to.equal(1);
  });

  it('should be revert because a new user staking before event date', async function () {
    await contractTestToken.transfer(user1.address, 1000);
    await contractTestToken.transfer(user2.address, 400);
    await contractTestToken.transfer(user3.address, 1000);
    await contractTestToken.connect(user1).approve(stakingContract.address, 1000);
    await contractTestToken.connect(user2).approve(stakingContract.address, 400);
    await contractTestToken.connect(user3).approve(stakingContract.address, 1000);
    expect(stakingContract.connect(user1).staking(0, 200)).to.be.revertedWith(
      'StakingContract: This staking event has not yet starting',
    );
  });

  it('should NOT be able to unstake with empty account before event date', async function () {
    expect(stakingContract.connect(user1).unStaking(0)).to.be.revertedWith('StakingContract: No token to be unstaked');
  });

  it('Time travel to start staking date', async function () {
    await timeTravel(dayToSec(1));
  });

  it('should NOT be able to unstake with empty account after event date', async function () {
    expect(stakingContract.connect(user1).unStaking(0)).to.be.revertedWith('StakingContract: No token to be unstaked');
  });

  it('should be revert because a new user staking hit limit', async function () {
    await expect(stakingContract.connect(user1).staking(0, 501)).to.be.revertedWith(
      'StakingContract: Token limit per user exceeded',
    );
  });

  it('user1: should stake 400 tokens successfully', async function () {
    const r = await (await stakingContract.connect(user1).staking(0, 400)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    expect(await stakingContract.connect(user1).getCurrentUserStakingAmount(0)).to.equal(400);
  });

  it('user2: should NOT be able to stake 500 Tokens', async function () {
    expect(stakingContract.connect(user2).staking(0, 500)).to.be.revertedWith('StakingContract: Insufficient balance');
  });

  it('user2: should be able to stake 400 Tokens', async function () {
    const r = await (await stakingContract.connect(user2).staking(0, 400)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    expect(await stakingContract.connect(user2).getCurrentUserStakingAmount(0)).to.equal(400);
  });

  it('user3: should be able to stake 300 Tokens', async function () {
    const r = await (await stakingContract.connect(user3).staking(0, 300)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    expect(await stakingContract.connect(user3).getCurrentUserStakingAmount(0)).to.equal(300);
  });

  it('Time travel to next 10 days', async function () {
    await timeTravel(dayToSec(10));
  });

  /**
   * Rate: 0.266%
   * Amount: 400
   * Duration: 10 days
   * RawBoxNumber: 400*0.2666%*10 ~ 10.64
   * RoundedBoxNumber: 10
   * Total = 10.64
   * ViewTotalSum = 10
   */
  it('User1 & user2: should be able to reward 10 boxes after 10 days ', async function () {
    expect(await stakingContract.connect(user1).viewUserReward(0)).to.equals(10);
  });

  it('user2: should be able to unstake with penalty', async function () {
    await stakingContract.connect(user2).unStaking(0);
    expect(await contractTestToken.balanceOf(user2.address)).to.equals(400 * 0.98);
    expect(await stakingContract.connect(user2).getCurrentUserStakingAmount(0)).to.equal(0);
  });

  /**
   * After unstaking before due, user cannot claim any boxes
   */
  it('user2: should NOT be able to claim any boxes', async function () {
    expect(await stakingContract.connect(user2).viewUserReward(0)).to.equal(0);
    expect(stakingContract.connect(user2).claimBoxes(0, 10)).to.be.revertedWith('StakingContract: Insufficient boxes');
  });

  it('User1: should NOT be able to claim boxes', async function () {
    expect(stakingContract.connect(user1).claimBoxes(0, 2)).to.be.revertedWith(
      'StakingContract: Unable to claim boxes before locked time',
    );
  });

  it('User1: Should be failed when restake 101 token at date 10 (limitStakingAmountForUser = 500)', async function () {
    expect(stakingContract.connect(user1).staking(0, 101)).to.be.revertedWith(
      'StakingContract: Token limit per user exceeded',
    );
  });

  it('user1 should stake 100 tokens more successfully', async function () {
    await stakingContract.connect(user1).staking(0, 100);
    expect(await stakingContract.connect(user1).getCurrentUserStakingAmount(0)).to.equal(500);
  });

  it('Time travel to next 5 days', async function () {
    await timeTravel(dayToSec(5));
  });

  it('user2: should NOT be able to earn any boxes after 5 days', async function () {
    expect(await stakingContract.connect(user2).viewUserReward(0)).to.equal(0);
  });
  /**
   * New pending box
   * Rate: 0.266%
   * Amount: 500
   * Duration: 5 days
   * RawBoxNumber: 500*0.2666%*5 = 6.65
   * RoundedBoxNumber: 6
   * TotalSum = 10.64 + 6.65 = 17.29
   * ViewTotalSum = 17
   */
  it('user reward after 15 days should be 17', async function () {
    expect(await stakingContract.connect(user1).viewUserReward(0)).to.equals(17);
  });

  it('should NOT be able to claim 20 boxes', async function () {
    expect(stakingContract.connect(user1).claimBoxes(0, 20)).to.be.revertedWith('StakingContract: Insufficient boxes');
  });

  it('should NOT be able to claim 0 boxes', async function () {
    expect(stakingContract.connect(user1).claimBoxes(0, 0)).to.be.revertedWith('StakingContract: Minimum 1 box');
  });

  /**
   * TotalSum = 17.29
   * claim = 10
   * newSum = 7.29
   * ViewNewSum = 7
   */
  it('user1: should be able to claim 10 boxes', async function () {
    const r = await (await stakingContract.connect(user1).claimBoxes(0, 10)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'IssueBoxes');
    expect(filteredEvents.length).to.equal(1);
    const eventArgs = filteredEvents[0].args;
    expect(eventArgs.owner).to.equals(user1.address);
    // TODO: update variable constant for rewardPhaseBoxId
    expect(eventArgs.rewardPhaseBoxId).to.equals(3);
    expect(eventArgs.numberOfBoxes).to.equals(10);
    expect(await stakingContract.connect(user1).viewUserReward(0)).to.equals(7);
  });

  it('user1: should NOT be able to claim 10 boxes', async function () {
    expect(stakingContract.connect(user1).claimBoxes(0, 10)).to.be.revertedWith('StakingContract: Insufficient boxes');
  });

  it('user3: should be able to unstake without penalty', async function () {
    expect(await contractTestToken.balanceOf(user3.address)).to.equals(700);
    await stakingContract.connect(user3).unStaking(0);
    expect(await stakingContract.connect(user3).getCurrentUserStakingAmount(0)).to.equals(0);
    expect(await contractTestToken.balanceOf(user3.address)).to.equals(1000);
  });

  it('user3: should be able to claimBoxes after unstaking', async function () {
    const r = await (await stakingContract.connect(user3).claimBoxes(0, 3)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'IssueBoxes');
    expect(filteredEvents.length).to.equal(1);
    const eventArgs = filteredEvents[0].args;
    expect(eventArgs.owner).to.equals(user3.address);
    // TODO: update variable constant for rewardPhaseBoxId
    expect(eventArgs.rewardPhaseBoxId).to.equals(3);
    expect(eventArgs.numberOfBoxes).to.equals(3);
    // remaining = currentBoxes - 3
    expect(await stakingContract.connect(user3).viewUserReward(0)).to.equals(8);
  });

  it('Time travel to next 15 days', async function () {
    await timeTravel(dayToSec(5));
  });

  it('user3: should NOT be earn any more boxes after unstaking', async function () {
    expect(await stakingContract.connect(user3).viewUserReward(0)).to.equals(8);
  });

  it('user2: should NOT be able to earn any boxes after 20 days since unstaking event', async function () {
    expect(await stakingContract.connect(user2).viewUserReward(0)).to.equal(0);
  });
});
