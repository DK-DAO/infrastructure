import hre from 'hardhat';
import { expect } from 'chai';
import { contractDeploy, randInt } from './helpers/functions';
import { BytesTest } from '../typechain';
import crypto from 'crypto';
import { BigNumber, Signer } from 'ethers';

let owner: Signer, contractBytesTest: BytesTest;
describe('BytesTest', function () {
  it('BytesTest mus be deployed correctly', async () => {
    [owner] = await hre.ethers.getSigners();
    contractBytesTest = <BytesTest>await contractDeploy(owner, 'test/BytesTest');
  });

  it('bytes to bytes32[] should be work properly', async () => {
    const size = randInt(5, 15);
    const input = crypto.randomBytes(size * 32);
    const result = await contractBytesTest.getBytesToBytes32Array(input);
    expect(result.every((v: string, i: number) => v === `0x${input.slice(i * 32, i * 32 + 32).toString('hex')}`)).to.eq(
      true,
    );
  });

  it('should able to read address from bytes', async () => {
    const size = randInt(5, 15);
    const offset = (size / 2) >>> 0;
    const input = crypto.randomBytes(size * 32);
    const result = await contractBytesTest.getAddress(input, offset);
    expect(result).to.eq(hre.ethers.utils.getAddress(`0x${input.slice(offset, offset + 20).toString('hex')}`));
  });

  it('should able to read uint256 from bytes', async () => {
    const size = randInt(5, 15);
    const offset = (size / 2) >>> 0;
    const input = crypto.randomBytes(size * 32);
    const result = await contractBytesTest.getUint256(input, offset);
    expect(result.eq(`0x${input.slice(offset, offset + 32).toString('hex')}`)).to.eq(true);
  });

  it('should able to read bytes from bytes', async () => {
    const size = randInt(5, 15);
    const offset = (size / 2) >>> 0;
    const length = ((size * 32) / 20) >>> 0;
    const input = crypto.randomBytes(size * 32);
    const result = await contractBytesTest.getBytes(input, offset, length);
    expect(result).to.eq(`0x${input.slice(offset, offset + length).toString('hex')}`);
  });
});
