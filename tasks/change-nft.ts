/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { registryRecords } from '../test/helpers/const';
import { contractDeploy } from './deploy';
// @ts-ignore
import { NFT, Registry } from '../typechain';

task('change', 'Change nft address')
  // .addParam('account', "The account's address")
  .setAction(async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const owner = hre.ethers.Wallet.fromMnemonic(process.env.DUELIST_KING_DEPLOY_MNEMONIC || '').connect(
      hre.ethers.provider,
    );

    const contractRegistry = <Registry>(
      await hre.ethers.getContractAt('Registry', '0x36c4C3Be384DC26bF810a5f03351d821BE1261f2')
    );

    const contractNFT = <NFT>(
      await contractDeploy(
        hre,
        owner,
        'DKDAO Infrastructure/NFT',
        contractRegistry.address,
        registryRecords.domain.infrastructure,
      )
    );
    console.log('Changed to:', contractNFT.address);

    await contractRegistry
      .connect(owner)
      .set(registryRecords.domain.infrastructure, registryRecords.name.nft, contractNFT.address);
  });

export default {};
