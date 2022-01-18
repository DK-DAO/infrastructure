import chai, { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { DuelistKingStaking, IRegistry, TestToken } from '../typechain';
import { solidity } from 'ethereum-waffle';
import Deployer from './helpers/deployer';
import { registryRecords } from './helpers/const';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

chai.use(solidity);

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

    const registry = <IRegistry>(
      await deployer.connect(infrastructureOperator).contractDeploy('Infrastructure/Registry', [])
    );

    // Register new operator in registry contract
    await registry.set(registryRecords.domain.duelistKing, registryRecords.name.staking, stakingOperator.address);
    await registry.set(
      registryRecords.domain.infrastructure,
      registryRecords.name.operator,
      infrastructureOperator.address,
    );

    stakingContract = <DuelistKingStaking>(
      await deployer
        .connect(stakingOperator)
        .contractDeploy('Duelist King/DuelistKingStaking', [], registry.address, registryRecords.domain.duelistKing)
    );
  });

  it('Initialize', async function () {
    const accounts = await ethers.getSigners();
    user1 = accounts[4];
    user2 = accounts[5];
    user3 = accounts[6];
    user4 = accounts[7];
    await contractTestToken.transfer(user1.address, 2000);
    await contractTestToken.transfer(user2.address, 400);
    await contractTestToken.transfer(user3.address, 1000);
    await contractTestToken.connect(user1).approve(stakingContract.address, 2000);
    await contractTestToken.connect(user2).approve(stakingContract.address, 500);
    await contractTestToken.connect(user3).approve(stakingContract.address, 1000);
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
      rewardPhaseBoxId: 3,
      numberOfLockDays: 15,
    };

    await expect(stakingContract.connect(infrastructureOperator).createNewStakingCampaign(config)).to.be.revertedWith(
      'UserRegistry: Only allow call from same domain',
    );
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

  it('create another campaign', async function () {
    const blocktime = await stakingContract.getBlockTime();
    const config = {
      startDate: blocktime.add(dayToSec(2)),
      endDate: blocktime.add(dayToSec(31)),
      returnRate: 1,
      maxAmountOfToken: 400000,
      stakedAmountOfToken: 0,
      limitStakingAmountForUser: 300,
      tokenAddress: contractTestToken.address,
      maxNumberOfBoxes: 32000,
      rewardPhaseBoxId: 4,
      numberOfLockDays: 12,
    };

    const r = await (await stakingContract.createNewStakingCampaign(config)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'NewCampaign');
    expect(filteredEvents.length).to.equal(1);
  });

  it('=========== Date 0 ============', () => {});

  it('Campaign 1: should be revert because a new user staking before event date', async function () {
    await expect(stakingContract.connect(user1).staking(0, 200)).to.be.revertedWith(
      'DKStaking: This staking event has not yet starting',
    );
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
    await expect(stakingContract.connect(user1).staking(0, 501)).to.be.revertedWith(
      'DKStaking: Token limit per user exceeded',
    );
  });

  it('Campaign 1: user1 should stake 400 tokens successfully', async function () {
    const r = await (await stakingContract.connect(user1).staking(0, 400)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    expect(await stakingContract.connect(user1).getCurrentUserStakingAmount(0)).to.equal(400);
  });

  it('Campaign 1: user2 should NOT be able to stake 500 Tokens', async function () {
    expect(stakingContract.connect(user2).staking(0, 500)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
  });

  it('Campaign 1: user2 should be able to stake 400 Tokens', async function () {
    const r = await (await stakingContract.connect(user2).staking(0, 400)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    expect(await stakingContract.connect(user2).getCurrentUserStakingAmount(0)).to.equal(400);
  });

  it('Campaign 1: user3 should be able to stake 300 Tokens', async function () {
    const r = await (await stakingContract.connect(user3).staking(0, 300)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    expect(await stakingContract.connect(user3).getCurrentUserStakingAmount(0)).to.equal(300);
  });

  it('Campaign 2: should be revert because a new user staking before event date', async function () {
    await expect(stakingContract.connect(user1).staking(1, 200)).to.be.revertedWith(
      'DKStaking: This staking event has not yet starting',
    );
  });

  it('Campaign 2: user1 should NOT be able to unstake with empty account before event date', async function () {
    await expect(stakingContract.connect(user1).unStaking(1)).to.be.revertedWith('DKStaking: No token to be unstaked');
  });

  it('=========== Date 11 ============', async function () {
    await timeTravel(dayToSec(10));
  });

  it('Campaign 2: user1 should be able to stake 100 Tokens', async function () {
    const r = await (await stakingContract.connect(user1).staking(1, 100)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    expect(await stakingContract.connect(user1).getCurrentUserStakingAmount(1)).to.equal(100);
  });

  it('Campaign 2: user3 should be able to stake 120 Tokens', async function () {
    const r = await (await stakingContract.connect(user3).staking(1, 120)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    expect(await stakingContract.connect(user3).getCurrentUserStakingAmount(1)).to.equal(120);
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
    expect(await stakingContract.connect(user1).getUserReward(0)).to.equals(10);
    expect(await stakingContract.connect(user2).getUserReward(0)).to.equals(10);
  });

  it('Campaign 1: user2 should be able to unstake with penalty', async function () {
    await stakingContract.connect(user2).unStaking(0);
    expect(await contractTestToken.balanceOf(user2.address)).to.equals(400 * 0.98);
    expect(await stakingContract.connect(user2).getCurrentUserStakingAmount(0)).to.equal(0);
    expect(await stakingContract.connect(user2).getUserReward(0)).to.equal(0);
    expect(await stakingContract.getTotalPenaltyAmount(contractTestToken.address)).to.equal(400 * 0.02);
  });

  it('Campaign 2: user1 should be able to unstake with penalty', async function () {
    await stakingContract.connect(user1).unStaking(1);
    expect(await contractTestToken.balanceOf(user1.address)).to.equals(1598);
    expect(await stakingContract.connect(user1).getCurrentUserStakingAmount(1)).to.equal(0);
    expect(await stakingContract.connect(user1).getUserReward(1)).to.equal(0);
    expect(await stakingContract.getTotalPenaltyAmount(contractTestToken.address)).to.equal(400 * 0.02 + 100 * 0.02);
  });

  /**
   * After unstaking before due, user cannot claim any boxes
   */
  it('Campaign 1: user2 should NOT be able to claim any boxes', async function () {
    expect(await stakingContract.connect(user2).getUserReward(0)).to.equal(0);
    await expect(stakingContract.connect(user2).claimBoxes(0)).to.be.revertedWith('DKStaking: Insufficient boxes');
  });

  it('Campaign 1: user1 should NOT be able to claim boxes', async function () {
    await expect(stakingContract.connect(user1).claimBoxes(0)).to.be.revertedWith(
      'DKStaking: Unable to claim boxes before locked time',
    );
  });

  it('Campagin 1: user1 should be failed when restake 101 token at date 11 (limitStakingAmountForUser = 500)', async function () {
    await expect(stakingContract.connect(user1).staking(0, 101)).to.be.revertedWith(
      'DKStaking: Token limit per user exceeded',
    );
  });

  it('Campaign 1: user1 should stake 100 tokens more successfully', async function () {
    await stakingContract.connect(user1).staking(0, 100);
    expect(await stakingContract.connect(user1).getCurrentUserStakingAmount(0)).to.equal(500);
  });

  it('=========== Date 16 ============', async function () {
    await timeTravel(dayToSec(5));
  });

  it('Campaign 1: user2 should NOT be able to earn any boxes at date 16', async function () {
    expect(await stakingContract.connect(user2).getUserReward(0)).to.equal(0);
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
    expect(await stakingContract.connect(user1).getUserReward(0)).to.equals(17);
  });

  it('Camapgin 1: user2 should NOT be able to claim boxes', async function () {
    await expect(stakingContract.connect(user2).claimBoxes(0)).to.be.revertedWith('DKStaking: Insufficient boxes');
  });

  /**
   * TotalSum = 17.32
   * Can claim = 17
   */
  it('Campaign 1: user1 should be able to claim 17 boxes', async function () {
    const r = await (await stakingContract.connect(user1).claimBoxes(0)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'ClaimRewardBoxes');
    expect(filteredEvents.length).to.equal(1);
    const eventArgs = filteredEvents[0].args;
    expect(eventArgs.owner).to.equals(user1.address);
    // TODO: update variable constant for rewardPhaseBoxId
    expect(eventArgs.rewardPhaseBoxId).to.equals(3);
    expect(eventArgs.numberOfBoxes).to.equals(17);
    expect(await stakingContract.connect(user1).getUserReward(0)).to.equals(0);
  });

  it('Capaign 1: user1 should NOT be able to claim boxes again', async function () {
    await expect(stakingContract.connect(user1).claimBoxes(0)).to.be.revertedWith('DKStaking: Insufficient boxes');
  });

  it('Campaign 1: user3 should be able to unstake without penalty', async function () {
    expect(await contractTestToken.balanceOf(user3.address)).to.equals(580);
    const r = await (await stakingContract.connect(user3).unStaking(0)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'ClaimRewardBoxes');
    const eventArgs = filteredEvents[0].args;
    expect(eventArgs.owner).to.equals(user3.address);
    expect(eventArgs.numberOfBoxes).to.equals(11);
    expect(eventArgs.rewardPhaseBoxId).to.equals(3);
    expect(filteredEvents.length).to.equal(1);
    expect(await stakingContract.connect(user3).getUserReward(0)).to.equals(0);
    expect(await stakingContract.connect(user3).getCurrentUserStakingAmount(0)).to.equals(0);
    expect(await contractTestToken.balanceOf(user3.address)).to.equals(880);
  });

  it('Campagn 1: user3 should NOT be able to claimBoxes after unstaking', async function () {
    await expect(stakingContract.connect(user3).claimBoxes(0)).to.be.revertedWith('DKStaking: Insufficient boxes');
  });

  it('Campaign 2: user3 reward should be 1', async function () {
    expect(await stakingContract.connect(user3).getUserReward(1)).to.equals(1);
  });

  it('=========== Date 21 ============', async function () {
    await timeTravel(dayToSec(5));
  });

  it('Campiagn 1: user3 should NOT be earn any more boxes after unstaking', async function () {
    expect(await stakingContract.connect(user3).getUserReward(0)).to.equals(0);
  });

  it('Campaign 1: user2 should NOT be able to earn any boxes at date 21 since unstaking event', async function () {
    expect(await stakingContract.connect(user2).getUserReward(0)).to.equal(0);
  });

  it('Campaign 1: user2 should NOT be able to stake', async function () {
    await expect(stakingContract.connect(user2).staking(0, 100)).to.be.revertedWith(
      'DKStaking: Not enough staking duration',
    );
  });

  it('Campaign 2: user2 should NOT be able to stake', async function () {
    await expect(stakingContract.connect(user2).staking(1, 100)).to.be.revertedWith(
      'DKStaking: Not enough staking duration',
    );
  });

  it('Campaign 2: user3 reward should be 3', async function () {
    expect(await stakingContract.connect(user3).getUserReward(1)).to.equals(3);
  });

  it('=========== Date 26 ============', async function () {
    await timeTravel(dayToSec(5));
  });

  it('Campaign 2: user3 should be able to unstake without penalty', async function () {
    expect(await contractTestToken.balanceOf(user3.address)).to.equals(880);
    const r = await (await stakingContract.connect(user3).unStaking(1)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'ClaimRewardBoxes');
    expect(filteredEvents.length).to.equal(1);
    const eventArgs = filteredEvents[0].args;
    expect(eventArgs.owner).to.equals(user3.address);
    expect(eventArgs.numberOfBoxes).to.equals(4);
    expect(eventArgs.rewardPhaseBoxId).to.equals(4);
    expect(await stakingContract.connect(user3).getUserReward(0)).to.equals(0);
    expect(await stakingContract.connect(user3).getCurrentUserStakingAmount(0)).to.equals(0);
    expect(await contractTestToken.balanceOf(user3.address)).to.equals(1000);
  });

  it('should NOT be able withdraw penalty token because of non registered user', async function () {
    await expect(stakingContract.connect(user2).withdrawPenaltyToken(0, user2.address)).to.be.revertedWith(
      'UserRegistry: Only allow call from same domain',
    );
  });

  it('Staking operator should be withdraw penalty token', async function () {
    expect(await stakingContract.getTotalPenaltyAmount(contractTestToken.address)).to.equal(400 * 0.02 + 100 * 0.02);
    // expect(await stakingContract.withdrawPenaltyToken(0, user4.address)).to.be.true;
    const r = await (await stakingContract.withdrawPenaltyToken(0, user4.address)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Withdrawal');
    expect(filteredEvents.length).to.equal(1);
    const eventArgs = filteredEvents[0].args;
    expect(eventArgs.beneficiary).to.equals(user4.address);
    expect(eventArgs.amount).to.equals(10);
  });

  it('should NOT see penalty token because of invalid token address', async function () {
    await expect(stakingContract.connect(user2).getTotalPenaltyAmount(user2.address)).to.be.revertedWith(
      'DKStaking: Token address is not a smart contract',
    );
  });
});
