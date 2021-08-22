/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { BigNumber, Signer } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { registryRecords } from '../test/helpers/const';
import { contractDeploy } from './deploy';
// @ts-ignore
import { ERC20, MultiSig, NFT, Registry } from '../typechain';

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
    params: [345600],
  });
}

task('live-test', 'Test the multi signature in forking network')
  // .addParam('account', "The account's address")
  .setAction(async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const a1 = await unlockAddress(hre, '0x1cF7727f8C933a0431e3B0F9E7082C30B64fcE8f');
    const a2 = await unlockAddress(hre, '0xeE4fe9347a7902253a515CC76EaA3253b47a1837');
    const zero = await unlockAddress(hre, '0x0000000000000000000000000000000000000000');
    
    await zero.sendTransaction({
      to: '0x1cF7727f8C933a0431e3B0F9E7082C30B64fcE8f',
      value: '0xde0b6b3a7640000'
    })

    await zero.sendTransaction({
      to: '0xeE4fe9347a7902253a515CC76EaA3253b47a1837',
      value: '0xde0b6b3a7640000'
    })

    const contractERC20 = <ERC20>(
      await hre.ethers.getContractAt(
        '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      )
    );

    
    const contractMultiSig = <MultiSig>(
      await hre.ethers.getContractAt('MultiSig', '0xDC9bD464Ab6cf1f8eB0F1a5D22d859e1FC10b65D')
    );

    await contractMultiSig.connect(a1).createProposal({
      delegate: false,
      expired: 0,
      executed: false,
      vote: 0,
      target: contractERC20.address,
      value: 0,
      data: contractERC20.interface.encodeFunctionData('transfer', [
        '0x68bE199e497FAe7ed11339BE388BF4a403CD1698',
        10 * 10 ** 6,
      ]),
    });

    await contractMultiSig.connect(a1).voteProposal(1, true);
    await contractMultiSig.connect(a2).voteProposal(1, true);
    await timeTravel(hre);

    await contractMultiSig.connect(a2).execute(1);

    console.log((await contractERC20.balanceOf('0x68bE199e497FAe7ed11339BE388BF4a403CD1698')).toString());
  });

export default {};
