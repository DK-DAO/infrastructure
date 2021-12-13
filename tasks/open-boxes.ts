/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { bigNumberToBytes32 } from '../test/helpers/functions';
import { DuelistKingDistributor } from '../typechain';

task('box:open', 'Open boxes')
  .addParam('distributor', 'NFT address')
  .addParam('tokenId', 'Token id')
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const distributorAddress = (taskArgs.distributor || '').trim();
    const tokenId = (taskArgs.tokenId || '').trim();
    const accounts = await hre.ethers.getSigners();
    if (hre.ethers.utils.isAddress(distributorAddress)) {
      const distributor = <DuelistKingDistributor>(
        await hre.ethers.getContractAt('DuelistKingDistributor', distributorAddress, accounts[0])
      );
      return distributor.openBoxes(bigNumberToBytes32(hre.ethers.BigNumber.from(tokenId)));
    }
    throw new Error('File not found or invalid creator address');
  });

export default {};
