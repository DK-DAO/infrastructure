import chai, { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { TestToken } from '../typechain';
import { solidity } from 'ethereum-waffle';
import Deployer from './helpers/deployer';

chai.use(solidity);

let stakingContract: any, contractTestToken: TestToken;
let stakingAccount: any;

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
  it('Initialize', async function () {
    const deployer: Deployer = Deployer.getInstance(hre);
    const accounts = await ethers.getSigners();
    stakingAccount = accounts[2];
    deployer.connect(accounts[0]);
    contractTestToken = <TestToken>await deployer.contractDeploy('test/TestToken', []);
    const Staking = await ethers.getContractFactory('StakingEarnBoxDKT');
    stakingContract = await Staking.deploy(accounts[0].address);
    await stakingContract.deployed();
    expect(await stakingContract.getOwnerAddress()).to.equal(accounts[0].address);
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
      'Staking: Token address is not a smart contract',
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
      'Staking: Only owner can create a new campaign',
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
    await contractTestToken.transfer(stakingAccount.address, 1000);
    await contractTestToken.connect(stakingAccount).approve(stakingContract.address, 1000);
    expect(stakingContract.connect(stakingAccount).staking(0, 200)).to.be.revertedWith(
      'Staking: This staking event has not yet starting',
    );
  });

  it('Time travel to start staking date', async function () {
    await timeTravel(dayToSec(1));
  });

  it('should be revert because a new user staking hit limit', async function () {
    await expect(stakingContract.connect(stakingAccount).staking(0, 501)).to.be.revertedWith(
      'Staking: Token limit per user exceeded',
    );
  });

  it('User should stake 400 tokens successfully', async function () {
    const r = await (await stakingContract.connect(stakingAccount).staking(0, 400)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    expect(await stakingContract.connect(stakingAccount).getCurrentUserStakingAmount(0)).to.equal(400);
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
   * TotalSum = 10
   */
  it('user reward after 10 days should be 10', async function () {
    expect(await stakingContract.connect(stakingAccount).getCurrentUserReward(0)).to.equals(10);
  });

  it('should NOT be able to claim boxes', async function () {
    expect(stakingContract.connect(stakingAccount).claimBoxes(0, 2)).to.be.revertedWith(
      'StakingContract: Unable to claim with less then 15 staking days',
    );
  });

  it('Should be failed when restake 101 token at date 10 (limitStakingAmountForUser = 500)', async function () {
    expect(stakingContract.connect(stakingAccount).staking(0, 101)).to.be.revertedWith(
      'Staking: Token limit per user exceeded',
    );
  });

  it('user should stake 100 tokens more successfully', async function () {
    await stakingContract.connect(stakingAccount).staking(0, 100);
    expect(await stakingContract.connect(stakingAccount).getCurrentUserStakingAmount(0)).to.equal(500);
  });

  it('Time travel to next 5 days', async function () {
    await timeTravel(dayToSec(5));
  });
  /**
   * New pending box
   * Rate: 0.266%
   * Amount: 500
   * Duration: 5 days
   * RawBoxNumber: 500*0.2666%*5 = 6.65
   * RoundedBoxNumber: 6
   * TotalSum+=6 = 16
   */
  it('user reward after 15 days should be 16', async function () {
    expect(await stakingContract.connect(stakingAccount).getCurrentUserReward(0)).to.equals(16);
  });

  it('should NOT be able to claim 20 boxes', async function () {
    expect(stakingContract.connect(stakingAccount).claimBoxes(0, 20)).to.be.revertedWith(
      'StakingContract: Insufficient balance',
    );
  });

  it('should NOT be able to claim 0 boxes', async function () {
    expect(stakingContract.connect(stakingAccount).claimBoxes(0, 0)).to.be.revertedWith(
      'StakingContract: Minimum 1 box',
    );
  });

  it('should be able to claim 10 boxes', async function () {
    const r = await (await stakingContract.connect(stakingAccount).claimBoxes(0, 10)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'IssueBoxes');
    expect(filteredEvents.length).to.equal(1);
    const eventArgs = filteredEvents[0].args;
    expect(eventArgs.owner).to.equals(stakingAccount.address);
    // TODO: update variable constance
    expect(eventArgs.rewardPhaseBoxId).to.equals(3);
    expect(eventArgs.numberOfBoxes).to.equals(10);
    expect(await stakingContract.connect(stakingAccount).getCurrentUserReward(0)).to.equals(6);
  });
});
