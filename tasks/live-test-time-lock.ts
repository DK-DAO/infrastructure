/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { Signer } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
// @ts-ignore
import { DuelistKingToken, TimeLock } from '../typechain';

export async function unlockAddress(hre: HardhatRuntimeEnvironment, address: string): Promise<Signer> {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  return hre.ethers.provider.getSigner(address);
}

async function timeTravel(hre: HardhatRuntimeEnvironment) {
  await hre.network.provider.request({
    method: 'evm_increaseTime',
    params: [86400 * 10],
  });
}

task('live-test:time-lock', 'Test the multi signature in forking network').setAction(
  async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const { provider } = hre.ethers;
    const receiverAddress = '0xB225172Bd7F20990C6C5be3EEce435C1D197f709';
    const owner = await unlockAddress(hre, '0x25FBabC27be0dFFd966b73019c0FB962200d8cB2');
    const receiver = await unlockAddress(hre, '0xB225172Bd7F20990C6C5be3EEce435C1D197f709');
    const timeLock = <TimeLock>await hre.ethers.getContractAt('TimeLock', '0x011dF4453Effc599d08071bCF6A7864d8fF158C6');
    const dktToken = <DuelistKingToken>(
      await hre.ethers.getContractAt('DuelistKingToken', '0x7Ceb519718A80Dd78a8545AD8e7f401dE4f2faA7')
    );
    console.log(
      'Balance owner:',
      (await dktToken.balanceOf(await owner.getAddress())).div(10n ** 18n).toString(),
      'DKT',
    );
    const balanceBefore = await dktToken.balanceOf(receiverAddress);
    // eslint-disable-next-line no-param-reassign
    hre.config.networks.hardhat.gasPrice = (await provider.getGasPrice()).add(5000000).toNumber();

    console.log('Complete transfer DKT to Time Lock');

    await timeTravel(hre);
    console.log('Complete withdraw');
    await timeLock.connect(receiver).withdraw();

    const balanceAfter = await dktToken.balanceOf(receiverAddress);
    console.log(
      'Balance change:',
      balanceAfter
        .sub(balanceBefore)
        .div(10n ** 18n)
        .toString(),
      'DKT',
    );
  },
);

export default {};
