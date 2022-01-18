/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
import '@nomiclabs/hardhat-ethers';
import fs from 'fs';
import { BigNumber } from 'bignumber.js';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const parse = require('csv-parse/lib/sync');

const addressLog: string[] = [];

function toHexString(bn: BigNumber): string {
  let hexString = bn.toString(16).replace(/0x/gi, '');
  if (hexString.length % 2 !== 0) {
    hexString = hexString.padStart(hexString.length + 1, '0');
  }
  return `0x${hexString}`;
}

task('transfer:native', 'Distribute native token')
  .addParam('file', 'CSV data file')
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const dataFile = (taskArgs.file || '').trim();
    if (fs.existsSync(dataFile)) {
      const tokenTransferData = parse(fs.readFileSync(dataFile));
      const accounts = await hre.ethers.getSigners();
      let nonce = await accounts[0].getTransactionCount();
      for (let i = 0; i < tokenTransferData.length; i += 1) {
        const [address, amount] = tokenTransferData[i];
        const cleanAddress = address.trim();
        const gasPrice = await hre.ethers.provider.getGasPrice();
        const cleanAmount = hre.ethers.BigNumber.from(toHexString(new BigNumber(amount).times('1e+18')));
        if (hre.ethers.utils.isAddress(cleanAddress)) {
          console.log(
            'Process',
            cleanAddress,
            'amount:',
            new BigNumber(cleanAmount.toString()).div('1e+18').toString(),
            'ETH',
          );
          await (
            await accounts[0].sendTransaction({
              to: cleanAddress,
              value: cleanAmount,
              nonce,
              gasPrice,
            })
          ).wait();
          nonce += 1;
        } else {
          addressLog.push(cleanAddress);
        }
      }
      console.log(addressLog);
      return;
    }
    throw new Error('File not found or invalid creator address');
  });

export default {};
