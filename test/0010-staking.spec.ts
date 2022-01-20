import chai, { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { DuelistKingStaking, IRegistry, TestToken } from '../typechain';
import { solidity } from 'ethereum-waffle';
import Deployer from './helpers/deployer';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';

chai.use(solidity);
const decimals = BigNumber.from('10').pow(18);
const hardCodeDecimals = BigNumber.from('10').pow(18);

let stakingContract: DuelistKingStaking, contractTestToken: TestToken;
let user1: SignerWithAddress, user2: SignerWithAddress, user3: SignerWithAddress, user4: SignerWithAddress;
let infrastructureOperator: any, stakingOperator: any;

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

describe('DKStaking', function () {
  this.beforeAll('Before init', async function () {
    const accounts = await ethers.getSigners();
    infrastructureOperator = accounts[0];
    stakingOperator = accounts[1];
    const deployer: Deployer = Deployer.getInstance(hre);

    contractTestToken = <TestToken>await deployer.connect(accounts[0]).contractDeploy('test/TestToken', []);

    stakingContract = <DuelistKingStaking>(
      await deployer.connect(stakingOperator).contractDeploy('Duelist King/DuelistKingStaking', [])
    );
  });

  it('Initialize', async function () {
    const accounts = await ethers.getSigners();
    user1 = accounts[4];
    user2 = accounts[5];
    user3 = accounts[6];
    user4 = accounts[7];
    await contractTestToken.transfer(user1.address, BigNumber.from('2000').mul(decimals));
    await contractTestToken.transfer(user2.address, BigNumber.from('400').mul(decimals));
    await contractTestToken.transfer(user3.address, BigNumber.from('1000').mul(decimals));
    await contractTestToken.connect(user1).approve(stakingContract.address, BigNumber.from('2000').mul(decimals));
    await contractTestToken.connect(user2).approve(stakingContract.address, BigNumber.from('600').mul(decimals));
    await contractTestToken.connect(user3).approve(stakingContract.address, BigNumber.from('1000').mul(decimals));
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
      rewardPhaseId: 3,
      totalReceivedBoxes: 0,
    };

    await expect(stakingContract.createNewStakingCampaign(config)).to.be.revertedWith(
      'DKStaking: Token address is not a smart contract',
    );
  });

  it('should be failed because of random user creating a new campaign', async function () {
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
      rewardPhaseId: 3,
      totalReceivedBoxes: 0,
    };

    await expect(stakingContract.connect(infrastructureOperator).createNewStakingCampaign(config)).to.be.revertedWith(
      'DKStaking: Only operator is allowed',
    );
    await expect(stakingContract.connect(accounts[3]).createNewStakingCampaign(config)).to.be.revertedWith(
      'DKStaking: Only operator is allowed',
    );
  });

  it('should return campaign something when created', async function () {
    const blocktime = await stakingContract.getBlockTime();
    const config = {
      startDate: blocktime.add(dayToSec(1)),
      endDate: blocktime.add(dayToSec(31)),
      returnRate: 1,
      maxAmountOfToken: BigNumber.from('400000').mul(decimals),
      stakedAmountOfToken: 0,
      limitStakingAmountForUser: BigNumber.from('500').mul(decimals),
      tokenAddress: contractTestToken.address,
      maxNumberOfBoxes: 32000,
      rewardPhaseId: 3,
      totalReceivedBoxes: 0,
    };

    const r = await (await stakingContract.createNewStakingCampaign(config)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'NewCampaign');
    expect(filteredEvents.length).to.equal(1);
  });

  it('create another campaign', async function () {
    const blocktime = await stakingContract.getBlockTime();
    const config = {
      startDate: blocktime.add(dayToSec(2)),
      endDate: blocktime.add(dayToSec(31)),
      returnRate: 1,
      maxAmountOfToken: BigNumber.from('400000').mul(decimals),
      stakedAmountOfToken: 0,
      limitStakingAmountForUser: BigNumber.from('300').mul(decimals),
      tokenAddress: contractTestToken.address,
      maxNumberOfBoxes: 32000,
      rewardPhaseId: 4,
      totalReceivedBoxes: 0,
    };

    const r = await (await stakingContract.createNewStakingCampaign(config)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'NewCampaign');
    expect(filteredEvents.length).to.equal(1);
  });

  it('=========== Date 0 ============', () => {});

  it('Campaign 1: should be revert because a new user staking before event date', async function () {
    const amount = BigNumber.from('200').mul(decimals);
    await expect(stakingContract.connect(user1).staking(0, amount)).to.be.revertedWith('DKStaking: Not in event time');
  });

  it('Campaign 1: should NOT be able to unstake with empty account before event date', async function () {
    await expect(stakingContract.connect(user1).unStaking(0)).to.be.revertedWith('DKStaking: No token to be unstaked');
  });

  it('=========== Date 1 ============: Campaign 1 started, Campaign 2 not yet', async function () {
    await timeTravel(dayToSec(1));
  });

  it('Campaign 1: user1 should NOT be able to unstake with empty account after event date', async function () {
    await expect(stakingContract.connect(user1).unStaking(0)).to.be.revertedWith('DKStaking: No token to be unstaked');
  });

  it('Campaign 1: user1 should be revert because a new user staking hit limit', async function () {
    const amount = BigNumber.from('501').mul(decimals);
    await expect(stakingContract.connect(user1).staking(0, amount)).to.be.revertedWith(
      'DKStaking: Token limit per user exceeded',
    );
  });

  it('Campaign 1: user1 should stake 400 tokens successfully', async function () {
    const amount = BigNumber.from('400').mul(decimals);
    const r = await (await stakingContract.connect(user1).staking(0, amount)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    const eventArgs = filteredEvents[0].args;
    expect(eventArgs.owner).to.equals(user1.address);
    expect(eventArgs.amount).to.equals(amount);
    expect(eventArgs.campaignId).to.equals(0);
    const userSlot = await stakingContract.connect(user1).getUserStakingSlot(0, user1.address);
    expect(userSlot.stakingAmountOfToken).to.equals(amount);
    expect(await contractTestToken.balanceOf(user1.address)).to.equals(BigNumber.from('1600').mul(decimals));
  });

  it('Campaign 1: user2 should NOT be able to stake 500 Tokens', async function () {
    const amount = BigNumber.from('500').mul(decimals);
    expect(stakingContract.connect(user2).staking(0, amount)).to.be.revertedWith(
      'ERC20: transfer amount exceeds balance',
    );
  });

  it('Campaign 1: user2 should be able to stake 400 Tokens', async function () {
    const amount = BigNumber.from('400').mul(decimals);
    const r = await (await stakingContract.connect(user2).staking(0, amount)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    const stakingArgs = filteredEvents[0].args;
    expect(stakingArgs.owner).to.equals(user2.address);
    expect(stakingArgs.amount).to.equals(amount);
    expect(stakingArgs.campaignId).to.equals(0);
    const userSlot = await stakingContract.getUserStakingSlot(0, user2.address);
    expect(userSlot.stakingAmountOfToken).to.equal(amount);
  });

  it('Campaign 1: user3 should be able to stake 300 Tokens', async function () {
    const amount = BigNumber.from('300').mul(decimals);
    const r = await (await stakingContract.connect(user3).staking(0, amount)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    const stakingArgs = filteredEvents[0].args;
    expect(stakingArgs.owner).to.equals(user3.address);
    expect(stakingArgs.amount).to.equals(amount);
    expect(stakingArgs.campaignId).to.equals(0);
    const userSlot = await stakingContract.getUserStakingSlot(0, user3.address);
    expect(userSlot.stakingAmountOfToken).to.equal(amount);
  });

  it('Campaign 2: should be revert because a new user staking before event date', async function () {
    const amount = BigNumber.from('200').mul(decimals);
    await expect(stakingContract.connect(user1).staking(1, amount)).to.be.revertedWith('DKStaking: Not in event time');
  });

  it('Campaign 2: user1 should NOT be able to unstake with empty account before event date', async function () {
    await expect(stakingContract.connect(user1).unStaking(1)).to.be.revertedWith('DKStaking: No token to be unstaked');
  });

  it('=========== Date 11 ============', async function () {
    await timeTravel(dayToSec(10));
  });

  it('Campaign 2: user1 should be able to stake 100 tokens', async function () {
    const amount = BigNumber.from('100').mul(decimals);
    const r = await (await stakingContract.connect(user1).staking(1, amount)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    const userSlot = await stakingContract.getUserStakingSlot(1, user1.address);
    expect(userSlot.stakingAmountOfToken).to.equal(amount);
  });

  it('Campaign 2: user3 should be able to stake 120 Tokens', async function () {
    const amount = BigNumber.from('120').mul(decimals);
    const r = await (await stakingContract.connect(user3).staking(1, amount)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    const userSlot = await stakingContract.getUserStakingSlot(1, user3.address);
    expect(userSlot.stakingAmountOfToken).to.equal(amount);
  });

  /**
   * Campaign 1
   * Rate: 0.266%
   * Amount: 400
   * Duration: 10 days
   * RawBoxNumber: 400*0.2666%*10 ~ 10.64
   * RoundedBoxNumber: 10
   */
  it('Campaign 1: user1 & user2 should be able to reward 10 boxes at date 11 ', async function () {
    const userSlot1 = await stakingContract.getUserStakingSlot(0, user1.address);
    const userSlot2 = await stakingContract.getUserStakingSlot(0, user2.address);
    expect(userSlot1.stakedReward.div(hardCodeDecimals)).to.equals(10);
    expect(userSlot2.stakedReward.div(hardCodeDecimals)).to.equals(10);
  });

  it('Campaign 1: user2 should be able to unstake with penalty', async function () {
    const r = await (await stakingContract.connect(user2).unStaking(0)).wait();
    const rewardBoxesEvents = <any>r.events?.filter((e: any) => e.event === 'ClaimReward');
    expect(rewardBoxesEvents.length).to.equal(1);
    const eventArgs = rewardBoxesEvents[0].args;
    expect(eventArgs.owner).to.equals(user2.address);
    expect(eventArgs.numberOfBoxes).to.equals(5);
    expect(eventArgs.rewardPhaseId).to.equals(3);
    expect(eventArgs.campaignId).to.equals(0);
    expect(eventArgs.withdrawAmount).to.equals(BigNumber.from(392).mul(decimals));
    expect(eventArgs.isPenalty).to.equals(true);
    expect(await contractTestToken.balanceOf(user2.address)).to.equals(BigNumber.from(392).mul(decimals));

    const userSlot = await stakingContract.getUserStakingSlot(0, user2.address);
    expect(userSlot.stakingAmountOfToken).to.equal(0);
    expect(userSlot.stakedReward).to.equal(0);
    expect(await stakingContract.getTotalPenaltyAmount(contractTestToken.address)).to.equal(
      BigNumber.from(8).mul(decimals),
    );
    const campaign = await stakingContract.getCampaignInfo(0);
    expect(campaign.totalReceivedBoxes).to.equals(5);
  });

  it('Campaign 2: user1 should be able to unstake with penalty', async function () {
    const r = await (await stakingContract.connect(user1).unStaking(1)).wait(0);
    const rewardBoxesEvents = <any>r.events?.filter((e: any) => e.event === 'ClaimReward');
    expect(rewardBoxesEvents.length).to.equal(1);
    const eventArgs = rewardBoxesEvents[0].args;
    expect(eventArgs.owner).to.equals(user1.address);
    expect(eventArgs.numberOfBoxes).to.equals(0);
    expect(eventArgs.rewardPhaseId).to.equals(4);
    expect(eventArgs.campaignId).to.equals(1);
    expect(eventArgs.withdrawAmount).to.equals(BigNumber.from('98').mul(decimals));
    expect(eventArgs.isPenalty).to.equals(true);

    const userSlot = await stakingContract.getUserStakingSlot(1, user1.address);
    expect(await contractTestToken.balanceOf(user1.address)).to.equals(BigNumber.from('1598').mul(decimals));
    expect(userSlot.stakingAmountOfToken).to.equal(0);
    expect(userSlot.stakedReward).to.equal(0);
    expect(await stakingContract.getTotalPenaltyAmount(contractTestToken.address)).to.equal(
      BigNumber.from('10').mul(decimals),
    );
    const campaign = await stakingContract.getCampaignInfo(0);
    expect(campaign.totalReceivedBoxes).to.equals(5);
  });

  it('Campaign 1: user2 should NOT be able to unstake again', async function () {
    const userSlot = await stakingContract.getUserStakingSlot(0, user2.address);
    expect(userSlot.stakedReward).to.equal(0);
    await expect(stakingContract.connect(user2).unStaking(0)).to.be.revertedWith('DKStaking: No token to be unstaked');
  });

  it('Campagin 1: user1 should be failed when restake 101 token at date 11 (limitStakingAmountForUser = 500)', async function () {
    const amount = BigNumber.from('101').mul(decimals);
    await expect(stakingContract.connect(user1).staking(0, amount)).to.be.revertedWith(
      'DKStaking: Token limit per user exceeded',
    );
  });

  it('Campaign 1: user1 should stake 100 tokens more successfully', async function () {
    const amount = BigNumber.from('100').mul(decimals);
    await stakingContract.connect(user1).staking(0, amount);
    const userSlot = await stakingContract.getUserStakingSlot(0, user1.address);
    expect(userSlot.stakingAmountOfToken).to.equal(BigNumber.from(500).mul(decimals));
  });

  it('=========== Date 16 ============', async function () {
    await timeTravel(dayToSec(5));
  });

  it('Campaign 1: user2 should NOT be able to earn any boxes at date 16', async function () {
    const userSlot = await stakingContract.getUserStakingSlot(0, user2.address);
    expect(userSlot.stakedReward).to.equal(0);
    expect(userSlot.stakingAmountOfToken).to.equal(0);
  });
  /**
   * New pending box
   * Rate: 0.266%
   * Amount: 500
   * Duration: 5 days
   * RawBoxNumber: 500*0.2666%*5 = 6.65
   * Latest raw box number = 10.64 + 6.65 = 17.32
   * RoundedBoxNumber = 17
   */
  it('Campaign 1: user1 reward should be 17', async function () {
    const userSlot = await stakingContract.getUserStakingSlot(0, user1.address);
    expect(userSlot.stakedReward.div(hardCodeDecimals)).to.equals(17);
  });

  it('Camapgin 1: user2 should NOT be able to unstake', async function () {
    await expect(stakingContract.connect(user2).unStaking(0)).to.be.revertedWith('DKStaking: No token to be unstaked');
  });

  it('Campaign 2: user3 reward should be 1', async function () {
    const userSlot = await stakingContract.getUserStakingSlot(1, user3.address);
    expect(userSlot.stakedReward.div(hardCodeDecimals)).to.equals(1);
  });

  it('=========== Date 21 ============', async function () {
    await timeTravel(dayToSec(5));
  });

  it('Campaign 1: user2 should NOT be able to earn any boxes at date 21 since unstaking event', async function () {
    const userSlot = await stakingContract.getUserStakingSlot(0, user2.address);
    expect(userSlot.stakedReward).to.equal(0);
  });

  it('Campaign 2: user3 reward should be 3', async function () {
    const userSlot = await stakingContract.getUserStakingSlot(1, user3.address);
    expect(userSlot.stakedReward.div(hardCodeDecimals)).to.equals(3);
  });

  it('=========== Date 30 ============', async function () {
    await timeTravel(dayToSec(9));
  });

  it('Campaign 1: user2 should NOT be able to stake', async function () {
    const amount = BigNumber.from('100').mul(decimals);
    await expect(stakingContract.connect(user2).staking(0, amount)).to.be.revertedWith('DKStaking: Not in event time');
  });

  it('Campaign 2: user2 should NOT be able to stake', async function () {
    const amount = BigNumber.from('100').mul(decimals);
    await expect(stakingContract.connect(user2).staking(1, amount)).to.be.revertedWith('DKStaking: Not in event time');
  });

  it('=========== Date 32 ============', async function () {
    await timeTravel(dayToSec(2));
  });

  it('Campaign 2: user3 should be able to unstake without penalty', async function () {
    expect(await contractTestToken.balanceOf(user3.address)).to.equals(BigNumber.from('580').mul(decimals));
    const r = await (await stakingContract.connect(user3).unStaking(1)).wait();
    const rewardBoxesEvents = <any>r.events?.filter((e: any) => e.event === 'ClaimReward');
    expect(rewardBoxesEvents.length).to.equal(1);
    const eventArgs = rewardBoxesEvents[0].args;
    expect(eventArgs.owner).to.equals(user3.address);
    expect(eventArgs.numberOfBoxes).to.equals(6);
    expect(eventArgs.rewardPhaseId).to.equals(4);
    expect(eventArgs.campaignId).to.equals(1);
    expect(eventArgs.withdrawAmount).to.equals(BigNumber.from('120').mul(decimals));
    expect(eventArgs.isPenalty).to.equals(false);

    const userSlot = await stakingContract.getUserStakingSlot(1, user3.address);

    expect(userSlot.stakedReward).to.equals(0);
    expect(userSlot.stakingAmountOfToken).to.equals(0);
    expect(await contractTestToken.balanceOf(user3.address)).to.equals(BigNumber.from('700').mul(decimals));
  });

  it('should NOT be able withdraw penalty token because of non registered user', async function () {
    await expect(stakingContract.connect(user2).withdrawPenaltyToken(0, user2.address)).to.be.revertedWith(
      'DKStaking: Only operator is allowed',
    );
    await expect(
      stakingContract.connect(infrastructureOperator).withdrawPenaltyToken(0, user2.address),
    ).to.be.revertedWith('DKStaking: Only operator is allowed');
  });

  it('Staking operator should be withdraw penalty token', async function () {
    expect(await stakingContract.connect(stakingOperator).getTotalPenaltyAmount(contractTestToken.address)).to.equal(
      BigNumber.from('10').mul(decimals),
    );
    const r = await (await stakingContract.withdrawPenaltyToken(0, user4.address)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Withdrawal');
    expect(filteredEvents.length).to.equal(1);
    const eventArgs = filteredEvents[0].args;
    expect(eventArgs.beneficiary).to.equals(user4.address);
    expect(eventArgs.amount).to.equals(BigNumber.from('10').mul(decimals));
    expect(eventArgs.campaignId).to.equals(0);
  });

  it('should NOT see penalty token because of invalid token address', async function () {
    await expect(stakingContract.connect(user2).getTotalPenaltyAmount(user2.address)).to.be.revertedWith(
      'DKStaking: Token address is not a smart contract',
    );
  });
});
