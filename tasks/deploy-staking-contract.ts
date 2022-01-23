/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import Deployer from '../test/helpers/deployer';
import { dayToSec } from '../test/helpers/functions';
import { DuelistKingStaking } from '../typechain';

task('deploy:staking', 'Deploy staking token earn FNT contract').setAction(
  async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const accounts = await hre.ethers.getSigners();
    const deployer: Deployer = Deployer.getInstance(hre);
    // We assume that accounts[0] is infrastructure operator
    deployer.connect(accounts[0]);
    const stakingContract = <DuelistKingStaking>await deployer.contractDeploy('DuelistKing/DuelistKingStaking', []);
    const blockTimeStamp = await stakingContract.getBlockTime();
    if (hre.network.name === 'testnet') {
      await (
        await stakingContract.connect(accounts[0]).createNewStakingCampaign({
          startDate: blockTimeStamp.add(60),
          endDate: blockTimeStamp.add(dayToSec(30)),
          returnRate: 0,
          maxAmountOfToken: hre.ethers.BigNumber.from(400000).mul('1000000000000000000'),
          maxNumberOfBoxes: 400000,
          tokenAddress: '0xf33B79F915fC4A870ED1b26356C9f6EB60638DB8',
          rewardPhaseId: 3,
          limitStakingAmountForUser: hre.ethers.BigNumber.from(1000).mul('1000000000000000000'),
          stakedAmountOfToken: 0,
          totalReceivedBoxes: 0,
        })
      ).wait();
    }
    deployer.printReport();
  },
);

export default {};
