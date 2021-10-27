import hre from 'hardhat';
import chai, { expect } from 'chai';
import { DuelistKingToken, VestingCreator, VestingContract, TimeLock } from '../typechain';
import { solidity } from 'ethereum-waffle';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import Deployer from './helpers/deployer';

chai.use(solidity);

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

const deployer: Deployer = Deployer.getInstance(hre);

let accounts: SignerWithAddress[], timeLock: TimeLock, dkToken: DuelistKingToken, myVestingContract: VestingContract;

describe('TimeLock', function () {
  it('TimeLock must be deployed correctly', async () => {
    accounts = await hre.ethers.getSigners();
    deployer.connect(accounts[0]);

    dkToken = <DuelistKingToken>await deployer.contractDeploy('test3/DuelistKingToken', [], accounts[0].address);
    timeLock = <TimeLock>(
      await deployer.contractDeploy(
        'test3/TimeLock',
        [],
        accounts[1].address,
        dkToken.address,
        Math.round(Date.now() / 1000),
      )
    );
    await dkToken.transfer(timeLock.address, 1000000);
  });

  it('beneficiary should able to withdraw token after the period', async () => {
    await timeTravel(dayToSec(1));
    await (await timeLock.connect(accounts[1]).withdraw()).wait();
    expect((await dkToken.balanceOf(accounts[1].address)).toNumber()).to.eq(1000000);
    expect((await dkToken.balanceOf(timeLock.address)).toNumber()).to.eq(0);
  });
});
