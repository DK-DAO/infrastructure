import chai, { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { TestToken } from '../typechain';
import { solidity } from 'ethereum-waffle';
import Deployer from './helpers/deployer';

chai.use(solidity);

let stakingContract: any, contractTestToken: TestToken;

describe('Staking', function () {
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
      numberOfLockDays: 15,
    };

    const r = await (await stakingContract.createNewStakingCampaign(config)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'NewCampaign');
    expect(filteredEvents.length).to.equal(1);
  });
});
