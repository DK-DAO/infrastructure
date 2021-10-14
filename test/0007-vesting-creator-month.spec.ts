import hre from 'hardhat';
import chai, { expect } from 'chai';
import { DuelistKingToken, VestingCreator, VestingContract } from '../typechain';
import { solidity } from 'ethereum-waffle';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import Deployer from './helpers/deployer';

chai.use(solidity);

function dayToSec(days: number) {
  return Math.round(days * 86400);
}

function monthToSec(month: number) {
  return month * dayToSec(30);
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

let accounts: SignerWithAddress[],
  vestingCreator: VestingCreator,
  dkToken: DuelistKingToken,
  myVestingContract: VestingContract;

describe('VestingCreator', function () {
  it('VestingCreator must be deployed correctly', async () => {
    accounts = await hre.ethers.getSigners();

    deployer.connect(accounts[0]);
    vestingCreator = <VestingCreator>await deployer.contractDeploy('test2/VestingCreator', []);
    dkToken = <DuelistKingToken>await deployer.contractDeploy('test2/DuelistKingToken', [], vestingCreator.address);
    console.log((await dkToken.balanceOf(vestingCreator.address)).toString());
    expect((await dkToken.balanceOf(vestingCreator.address)).div(10n ** 18n).toNumber()).to.eq(10000000);
    await vestingCreator.setToken(dkToken.address);
  });

  it('Owner should able to create new vesting contract', async () => {
    const r = await (
      await vestingCreator.createNewVesting({
        amount: 5000000,
        unlockAtTGE: 5000,
        startCliff: await vestingCreator.getBlockTime(),
        beneficiary: accounts[8].address,
        cliffDuration: monthToSec(6),
        releaseType: 1,
        vestingDuration: monthToSec(12),
      })
    ).wait();
    const [
      {
        args: { vestingContract },
      },
    ] = <any>r.events?.filter((e) => typeof e.event === 'string') || [
      {
        args: {
          vestingContract: '',
        },
      },
    ];

    myVestingContract = <VestingContract>(
      await deployer.connect(accounts[8]).contractAttach('VestingContract', vestingContract || '')
    );
    expect((await dkToken.balanceOf(accounts[8].address)).toNumber()).to.eq(5000);
  });

  it('Owner of genesis should able to transfer token to another address', async () => {
    vestingCreator.transfer(accounts[9].address, 1000000);
    expect((await dkToken.balanceOf(accounts[9].address)).toNumber()).to.eq(1000000);
  });

  it('beneficiary of vesting should not able to withdraw before vesting', async () => {
    let error = false;
    try {
      await myVestingContract.withdraw();
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('beneficiary of vesting should not able to withdraw after vesting less than 1 day', async () => {
    let error = false;
    try {
      await timeTravel(monthToSec(6.5));
      await myVestingContract.withdraw();
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('beneficiary should able withdraw token from vesting contract', async () => {
    await timeTravel(monthToSec(6));
    const unlocked = await myVestingContract.balanceOf(accounts[8].address);
    await myVestingContract.withdraw();
    expect(await dkToken.balanceOf(accounts[8].address)).to.eq(unlocked.add(5000));
    console.log('\t', (await dkToken.balanceOf(accounts[8].address)).toNumber(), 'DKT');
  });

  it('beneficiary should not able withdraw token from vesting contract since they withdraw all vested block', async () => {
    let error = false;
    try {
      await myVestingContract.withdraw();
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('beneficiary should able withdraw all token from vesting contract', async () => {
    await timeTravel(monthToSec(12));
    await myVestingContract.withdraw();
    expect((await dkToken.balanceOf(accounts[8].address)).toNumber()).to.eq(5000000);
  });

  it('beneficiary should not able withdraw token from vesting contract since they consumed all blocks', async () => {
    let error = false;
    try {
      await myVestingContract.withdraw();
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
  });
});
