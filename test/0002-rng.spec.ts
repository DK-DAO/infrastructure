import hre from 'hardhat';
import { expect } from 'chai';
import { buildDigestArray, buildDigest } from './helpers/functions';
import { BytesBuffer } from './helpers/bytes';
import { BytesLike } from 'ethers';
import initInfrastructure, { IConfiguration } from './helpers/deployer-infrastructure';
import initDuelistKing, { IDeployContext } from './helpers/deployer-duelist-king';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { craftProof } from './helpers/functions';

let digests: { s: Buffer[]; h: Buffer[]; v: Buffer };
let context: IDeployContext;
let accounts: SignerWithAddress[];
const commitRevealData = buildDigest();

describe('RNG', () => {
  it('All initialize should be correct', async () => {
    accounts = await hre.ethers.getSigners();
    context = await initDuelistKing(
      await initInfrastructure(hre, {
        network: hre.network.name,
        salesAgent: accounts[9],
        infrastructure: {
          operator: accounts[0],
          oracles: [accounts[1]],
        },
        duelistKing: {
          operator: accounts[2],
          oracles: [accounts[3]],
        },
      }),
    );
  });

  it('OracleProxy should able to forward commit call from oracle to RNG', async () => {
    const {
      infrastructure: { oracle, rng },
      config,
    } = context;

    // Anyone would able to trigger oracle with signed proof
    await (
      await oracle
        .connect(accounts[5])
        .safeCall(
          await craftProof(await hre.ethers.getSigner(config.infrastructure.oracleAddresses[0]), oracle),
          rng.address,
          0,
          rng.interface.encodeFunctionData('commit', [commitRevealData.h]),
        )
    ).wait();
  });

  it('OracleProxy should able to forward reveal call from oracle to RNG', async () => {
    const {
      infrastructure: { oracle, rng },
      duelistKing: { distributor },
      config,
    } = context;

    const data: BytesLike = BytesBuffer.newInstance()
      .writeAddress(distributor.address)
      .writeUint256('0x01')
      .writeUint256(commitRevealData.s)
      .invoke();

    // Anyone would able to trigger oracle with signed proof
    await (
      await oracle
        .connect(accounts[6])
        .safeCall(
          await craftProof(await hre.ethers.getSigner(config.infrastructure.oracleAddresses[0]), oracle),
          rng.address,
          0,
          rng.interface.encodeFunctionData('reveal', [data]),
        )
    ).wait();
    const { remaining } = await rng.getProgress();

    expect(remaining.toNumber()).to.eq(0);
  });

  it('OracleProxy should able to forward batchCommit call from oracle to RNG', async () => {
    digests = buildDigestArray(10);

    const {
      infrastructure: { oracle, rng },
      duelistKing: { distributor },
      config,
    } = context;

    const txResult = await (
      await oracle
        .connect(accounts[7])
        .safeCall(
          await craftProof(await hre.ethers.getSigner(config.infrastructure.oracleAddresses[0]), oracle),
          rng.address,
          0,
          rng.interface.encodeFunctionData('batchCommit', [digests.v]),
        )
    ).wait();

    console.log(`${txResult.gasUsed.toString()} Gas`);
    for (let i = 0; i < digests.s.length; i += 1) {
      const data: BytesLike = BytesBuffer.newInstance()
        .writeAddress(distributor.address)
        .writeUint256(`0x${(2 + i).toString(16).padStart(8, '0')}`)
        .writeUint256(digests.s[i])
        .invoke();
      await oracle
        .connect(accounts[8])
        .safeCall(
          await craftProof(await hre.ethers.getSigner(config.infrastructure.oracleAddresses[0]), oracle),
          rng.address,
          0,
          rng.interface.encodeFunctionData('reveal', [data]),
        );
    }
    const { remaining } = await rng.getProgress();
    expect(remaining.toNumber()).to.eq(0);
  });
});
