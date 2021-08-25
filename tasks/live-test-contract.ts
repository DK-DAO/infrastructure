/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { Signer, ethers } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
// @ts-ignore
import { ERC20, MultiSig } from '../typechain';

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

function toHexString(baseValue: number | bigint, decimal: number | bigint = 18): string {
  const h = (BigInt(baseValue) * 10n ** BigInt(decimal)).toString(16);
  return `0x${h.length % 2 === 0 ? h : `0${h}`}`;
}

task('live-test', 'Test the multi signature in forking network')
  .addParam('wallet', 'MultiSig wallet address', undefined, undefined, false)
  .setAction(async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const a1 = await unlockAddress(hre, '0x1cF7727f8C933a0431e3B0F9E7082C30B64fcE8f');
    const a2 = await unlockAddress(hre, '0xeE4fe9347a7902253a515CC76EaA3253b47a1837');
    const zero = await unlockAddress(hre, '0x0000000000000000000000000000000000000000');
    const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    const walletAddress = _taskArgs.wallet || '';
    const provider = new ethers.providers.StaticJsonRpcProvider(process.env.DUELIST_KING_MAINNET_RPC);
    const contractMultiSig = <MultiSig>await hre.ethers.getContractAt('MultiSig', walletAddress);
    const contractDAI = <ERC20>(
      await hre.ethers.getContractAt('@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20', daiAddress)
    );
    const balanceBefore = await contractDAI.balanceOf('0x68bE199e497FAe7ed11339BE388BF4a403CD1698');

    // eslint-disable-next-line no-param-reassign
    hre.config.networks.hardhat.gasPrice = (await provider.getGasPrice()).add(5000000).toNumber();

    // Add some money to the operators
    await zero.sendTransaction({
      to: '0x1cF7727f8C933a0431e3B0F9E7082C30B64fcE8f',
      value: toHexString(100),
    });

    await zero.sendTransaction({
      to: '0xeE4fe9347a7902253a515CC76EaA3253b47a1837',
      value: toHexString(100),
    });

    console.log('Complete transfer token to operators');

    // Transfer DAI to multi sig wallet
    await contractDAI.connect(zero).transfer(walletAddress, toHexString(10));

    console.log('Complete transfer DAI to MultiSig');

    // Create proposal
    await contractMultiSig.connect(a1).createProposal({
      delegate: false,
      expired: 0,
      executed: false,
      vote: 0,
      target: contractDAI.address,
      value: 0,
      data: contractDAI.interface.encodeFunctionData('transfer', [
        '0x68bE199e497FAe7ed11339BE388BF4a403CD1698',
        toHexString(10),
      ]),
    });
    console.log('Proposal created');
    const proposalIndex = await contractMultiSig.proposalIndex();

    await contractMultiSig.connect(a1).voteProposal(proposalIndex, true);
    await contractMultiSig.connect(a2).voteProposal(proposalIndex, true);
    console.log('Complete vote');
    await timeTravel(hre);

    await contractMultiSig.connect(a2).execute(proposalIndex);

    const balanceAfter = await contractDAI.balanceOf('0x68bE199e497FAe7ed11339BE388BF4a403CD1698');
    console.log(
      'Balance change:',
      balanceAfter
        .sub(balanceBefore)
        .div(10n ** 18n)
        .toString(),
      'DAI',
    );
  });

export default {};
