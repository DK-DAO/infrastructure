import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Staking', function () {
  it("Should return the new greeting once it's changed", async function () {
    const accounts = await ethers.getSigners();
    const Staking = await ethers.getContractFactory('StakingEarnBoxDKT');
    const staking = await Staking.deploy(accounts[0].address);
    await staking.deployed();

    expect(await staking.greet()).to.equal(accounts[0].address);
  });

  it('should return campaign something when created', async function () {
    const accounts = await ethers.getSigners();
    const Staking = await ethers.getContractFactory('StakingEarnBoxDKT');
    const staking = await Staking.deploy(accounts[0].address);
    const blocktime = await staking.getBlockTime();
    const config = {
      startDate: blocktime.add(Math.round(1 * 86400)),
      endDate: blocktime.add(Math.round(30 * 86400)),
      returnRate: 1,
      maxAmountOfToken: 4000000,
      stakedAmountOfToken: 0,
      limitStakingAmountForUser: 500,
      tokenAddress: '0xa6f79B60359f141df90A0C745125B131cAAfFD12',
      maxNumberOfBoxes: 32000,
      numberOfLockDays: 15,
    };
    const r = await (await staking.createNewStakingCampaign(config)).wait();
    const filteredEvents = <any>r.events?.filter((e: any) => e.event === 'NewCampaign');
    expect(filteredEvents.length).to.equal(1);
  });
});
