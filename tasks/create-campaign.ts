/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
// @ts-ignore
import { DuelistKingDistributor, OracleProxy } from '../typechain';

task('campaign', 'Deploy all contract')
  // .addParam('account', "The account's address")
  .setAction(async (_taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const [, dkOracle1] = await hre.ethers.getSigners();

    if (hre.network.name === 'rinkeby') {
      const contractDkDistributor = <DuelistKingDistributor>(
        await hre.ethers.getContractAt('DuelistKingDistributor', '0xEa82668E226E05C6484bF66D294aEBE6Eca09837')
      );

      const contractOracleProxy = <OracleProxy>(
        await hre.ethers.getContractAt('OracleProxy', '0x81aF8524AE2f7e7Ed26381dbBfF38203700f8b21')
      );

      await contractOracleProxy.connect(dkOracle1).safeCall(
        contractDkDistributor.address,
        0,
        contractDkDistributor.interface.encodeFunctionData('newCampaign', [
          {
            opened: 0,
            softCap: 1000000,
            deadline: 0,
            generation: 0,
            start: 0,
            end: 19,
            distribution: [
              '0x00000000000000000000000000000001000000000000000600000000000009c4',
              '0x000000000000000000000000000000020000000100000005000009c400006b6c',
              '0x00000000000000000000000000000003000000030000000400006b6c00043bfc',
              '0x00000000000000000000000000000004000000060000000300043bfc000fadac',
              '0x000000000000000000000000000000050000000a00000002000fadac0026910c',
              '0x000000000000000000000000000000050000000f000000010026910c004c4b40',
            ],
          },
        ]),
      );
    }

    if (hre.network.name === 'polygon') {
      const contractDkDistributor = <DuelistKingDistributor>(
        await hre.ethers.getContractAt('DuelistKingDistributor', '0x58247abEA4192DeB2e25799c93CFacc2B9f84716')
      );

      const contractOracleProxy = <OracleProxy>(
        await hre.ethers.getContractAt('OracleProxy', '0x53429d1fABa8b116BD55bC70a8170935Db149eAa')
      );

      await contractOracleProxy.connect(dkOracle1).safeCall(
        contractDkDistributor.address,
        0,
        contractDkDistributor.interface.encodeFunctionData('newCampaign', [
          {
            opened: 0,
            softCap: 1000000,
            deadline: 0,
            generation: 0,
            start: 0,
            end: 19,
            distribution: [
              '0x00000000000000000000000000000001000000000000000600000000000009c4',
              '0x000000000000000000000000000000020000000100000005000009c400006b6c',
              '0x00000000000000000000000000000003000000030000000400006b6c00043bfc',
              '0x00000000000000000000000000000004000000060000000300043bfc000fadac',
              '0x000000000000000000000000000000050000000a00000002000fadac0026910c',
              '0x000000000000000000000000000000050000000f000000010026910c004c4b40',
            ],
          },
        ]),
      );
    }
  });

export default {};
