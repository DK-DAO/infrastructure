/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import fs from 'fs';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import Deployer from '../test/helpers/deployer';
import { monthToSec } from '../test/helpers/functions';
import { VestingCreator } from '../typechain';

const parse = require('csv-parse/lib/sync');

const RELEASE_MONTHLY = 1;
const RELEASE_LINEAR = 2;

const cacheName = new Map<string, string>();

function toNumber(v: string): number {
  v = v.replace(/,/g, '');
  if (/^[0-9]+$/.test(v)) {
    return Number.parseInt(v, 10);
  }
  throw new Error('Unexpected input');
}

/*
function toPercent(v: string): number {
  v = v.replace(/%/g, '');
  if (/^[0-9.]+$/.test(v)) {
    return Number.parseFloat(v);
  }
  throw new Error('Unexpected input');
} */

task('create:vesting', 'Create vesting contract for each investor')
  .addParam('creator', 'Creator address')
  .addParam('file', 'CSV data file')
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const dataFile = (taskArgs.file || '').trim();
    const creatorAddress = (taskArgs.creator || '').trim();
    if (fs.existsSync(dataFile) && hre.ethers.utils.isAddress(creatorAddress)) {
      const tokenAllocationData = parse(fs.readFileSync(dataFile));
      const accounts = await hre.ethers.getSigners();
      const deployer: Deployer = Deployer.getInstance(hre);
      deployer.connect(accounts[0]);
      const creatorContract = <VestingCreator>(
        await deployer.contractAttach('Duelist King/VestingCreator', creatorAddress)
      );

      const processData = tokenAllocationData.map(
        ([, name, address, amount, , amountTge, cliffDuration, vestingDuration, vestingType]: [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]) => {
          if (name.trim() === '') {
            name = cacheName.get(address) || '';
          } else {
            cacheName.set(address, name);
          }
          const tokenAmount = toNumber(amount);
          const tokenAmountTge = toNumber(amountTge);
          // const percent = toPercent(percentTge);
          let releaseType = 255;
          if (vestingType === 'Linear') {
            releaseType = RELEASE_LINEAR;
          } else {
            releaseType = RELEASE_MONTHLY;
          }
          /*
            return {
              name,
              beneficiary: address.trim(),
              isAddress: hre.ethers.utils.isAddress(address.trim()),
              amount: tokenAmount,
              percent,
              unlockAtTGE: tokenAmountTge,
              isCorrectTge: Math.abs(Math.floor((tokenAmount * percent) / 100) - tokenAmountTge) <= 2,
              startCliff: 1635332700,
              cliffDuration: toNumber(cliffDuration),
              vestingDuration: toNumber(vestingDuration),
              releaseType,
            }; */
          return {
            beneficiary: address.trim(),
            unlockAtTGE: tokenAmountTge,
            cliffDuration: monthToSec(toNumber(cliffDuration)),
            startCliff: 1635332700,
            vestingDuration: monthToSec(toNumber(vestingDuration)),
            releaseType,
            amount: tokenAmount,
          };
        },
      );

      for (let i = 0; i < processData.length; i += 1) {
        const { beneficiary, unlockAtTGE, cliffDuration, startCliff, vestingDuration, releaseType, amount } =
          processData[i];
        console.log('Process', beneficiary);
        const data = {
          beneficiary,
          unlockAtTGE: hre.ethers.BigNumber.from(unlockAtTGE).mul(10n ** 18n),
          cliffDuration,
          startCliff,
          vestingDuration,
          releaseType,
          amount: hre.ethers.BigNumber.from(amount).mul(10n ** 18n),
        };
        const gasPrice = await hre.ethers.provider.getGasPrice();
        const calculatedGas = await creatorContract.estimateGas.createNewVesting(data);
        // Add 30% gas
        await creatorContract.createNewVesting(data, {
          gasLimit: calculatedGas.add(calculatedGas.div(3)),
          gasPrice: gasPrice.add(gasPrice.div(4)),
        });
      }
      return;
    }
    throw new Error('File not found or invalid creator address');
  });

export default {};
