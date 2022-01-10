import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { TestToken, MultiSig } from '../typechain';
import Deployer from './helpers/deployer';

let stakingContract: any, contractTestToken: TestToken;

describe.only('Staking', function () {
  it('Initialize', async function () {
    const deployer: Deployer = Deployer.getInstance(hre);
    const accounts = await ethers.getSigners();
    deployer.connect(accounts[0]);
    contractTestToken = <TestToken>await deployer.contractDeploy('test/TestToken', []);
    const Staking = await ethers.getContractFactory('StakingEarnBoxDKT');
    stakingContract = await Staking.deploy(accounts[0].address);
    await stakingContract.deployed();
    expect(await stakingContract.getOwnerAddress()).to.equal(accounts[0].address);
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
      numberOfLockDays: 15,
    };

    const r = await (await stakingContract.createNewStakingCampaign(config)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'NewCampaign');
    expect(filteredEvents.length).to.equal(1);
  });
});
