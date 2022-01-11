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

  it('should return campaign something when created', async function () {
    const blocktime = await stakingContract.getBlockTime();
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

    const r = await (await stakingContract.createNewStakingCampaign(config)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'NewCampaign');
    expect(filteredEvents.length).to.equal(1);
  });

  it('should be revert because a new user staking before event date', async function () {
    await contractTestToken.connect(stakingAccount).approve(stakingContract.address, 500);
    await contractTestToken.transfer(stakingAccount.address, 1000);
    await expect(stakingContract.connect(stakingAccount).staking(0, 200)).to.be.revertedWith(
      'Staking: This staking event has not yet starting',
    );
  });

  it('should be revert because a new user staking hit limit', async function () {
    await timeTravel(dayToSec(3));
    await expect(stakingContract.connect(stakingAccount).staking(0, 501)).to.be.revertedWith(
      'Staking: Token limit per user exceeded',
    );
  });

  it('User should stake 400 tokens successfully', async function () {
    await contractTestToken.connect(stakingAccount).approve(stakingContract.address, 500);
    const r = await (await stakingContract.connect(stakingAccount).staking(0, 400)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'Staking');
    expect(filteredEvents.length).to.equal(1);
    expect(await stakingContract.connect(stakingAccount).getCurrentUserStakingAmount(0)).to.equal(400);
  });
});
