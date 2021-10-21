/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { Signer } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import abiMultiSig from './MultiSig.json';
import { abi as abiERC20 } from '../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json';
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

function toWeiHexStr(baseValue: number | bigint, decimal: number | bigint = 18): string {
  const h = (BigInt(baseValue) * 10n ** BigInt(decimal)).toString(16);
  return `0x${h.length % 2 === 0 ? h : `0${h}`}`;
}

task('live-test', 'Test the multi signature in forking network')
  .addParam('wallet', 'MultiSig wallet address', undefined, undefined, false)
  .setAction(async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const { provider } = hre.ethers;
    const a1 = await unlockAddress(hre, '0x1cF7727f8C933a0431e3B0F9E7082C30B64fcE8f');
    const a2 = await unlockAddress(hre, '0xeE4fe9347a7902253a515CC76EaA3253b47a1837');
    const richKid = await unlockAddress(hre, '0xF68a4b64162906efF0fF6aE34E2bB1Cd42FEf62d');
    const bTusd = '0x14016E85a25aeb13065688cAFB43044C2ef86784';
    const receiverAddress = '0x68bE199e497FAe7ed11339BE388BF4a403CD1698';
    const walletAddress = _taskArgs.wallet || '';
    const accounts = await hre.ethers.getSigners();
    const contractMultiSig = <MultiSig>await hre.ethers.getContractAt(abiMultiSig, walletAddress, accounts[0]);
    const bTusdContract = <ERC20>await hre.ethers.getContractAt(abiERC20, bTusd, accounts[0]);
    const balanceBefore = await bTusdContract.balanceOf(receiverAddress);
    const balanceNativeBefore = await provider.getBalance(receiverAddress);

    // eslint-disable-next-line no-param-reassign
    hre.config.networks.hardhat.gasPrice = (await provider.getGasPrice()).add(5000000).toNumber();

    // Add some money to the operators
    await accounts[0].sendTransaction({
      to: await a1.getAddress(),
      value: toWeiHexStr(10),
    });

    await accounts[0].sendTransaction({
      to: await a2.getAddress(),
      value: toWeiHexStr(10),
    });

    await accounts[0].sendTransaction({
      to: contractMultiSig.address,
      value: toWeiHexStr(10),
    });

    console.log('Complete transfer token to operators');

    // Transfer TUSD to multi sig wallet
    await bTusdContract.connect(richKid).transfer(walletAddress, toWeiHexStr(10));

    console.log('Complete transfer TUSD to MultiSig');

    // Create proposal
    await contractMultiSig.connect(a1).createProposal({
      delegate: false,
      expired: 0,
      executed: false,
      vote: 0,
      target: bTusdContract.address,
      value: 0,
      data: bTusdContract.interface.encodeFunctionData('transfer', [receiverAddress, toWeiHexStr(10)]),
    });
    console.log('Proposal created');
    const proposalIndex = await contractMultiSig.proposalIndex();

    await contractMultiSig.connect(a1).voteProposal(proposalIndex, true);
    await contractMultiSig.connect(a2).voteProposal(proposalIndex, true);
    console.log('Complete vote');
    await timeTravel(hre);

    await contractMultiSig.connect(a2).execute(proposalIndex);

    // Create proposal
    await contractMultiSig.connect(a1).createProposal({
      delegate: false,
      expired: 0,
      executed: false,
      vote: 0,
      target: receiverAddress,
      value: await provider.getBalance(contractMultiSig.address),
      data: '0x',
    });
    console.log('Proposal created');
    const proposalIndex2 = await contractMultiSig.proposalIndex();

    await contractMultiSig.connect(a1).voteProposal(proposalIndex2, true);
    await contractMultiSig.connect(a2).voteProposal(proposalIndex2, true);
    console.log('Complete vote');
    await timeTravel(hre);

    await contractMultiSig.connect(a2).execute(proposalIndex2);

    const balanceAfter = await bTusdContract.balanceOf(receiverAddress);
    const balanceNativeAfter = await provider.getBalance(receiverAddress);
    console.log(
      'Balance change:',
      balanceAfter
        .sub(balanceBefore)
        .div(10n ** 18n)
        .toString(),
      'TUSD',
    );

    console.log(
      'Balance change:',
      balanceNativeAfter
        .sub(balanceNativeBefore)
        .div(10n ** 18n)
        .toString(),
      'ETH',
    );
  });

export default {};
