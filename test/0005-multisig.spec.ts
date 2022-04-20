import hre from 'hardhat';
import chai, { expect } from 'chai';
import { TestToken, MultiSig } from '../typechain';
import { utils, BigNumber } from 'ethers';
import { solidity } from 'ethereum-waffle';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import Deployer from './helpers/deployer';
import BytesBuffer from './helpers/bytes';

chai.use(solidity);

async function timeTravel() {
  await hre.network.provider.request({
    method: 'evm_increaseTime',
    params: [345600],
  });
}
let accounts: SignerWithAddress[], contractMultiSig: MultiSig, contractTestToken: TestToken;

describe('MultiSig', function () {
  it('MultiSig must be deployed correctly', async () => {
    accounts = await hre.ethers.getSigners();
    const deployer: Deployer = Deployer.getInstance(hre);
    deployer.connect(accounts[0]);
    contractTestToken = <TestToken>await deployer.contractDeploy('test/TestToken', []);
    contractMultiSig = <MultiSig>await deployer.contractDeploy(
      'test/MultiSig',
      [],
      accounts.slice(0, 4).map((e) => e.address),
    );

    await accounts[0].sendTransaction({
      to: contractMultiSig.address,
      value: 1000000,
    });

    await contractTestToken.transfer(contractMultiSig.address, 1000000);
  });

  it('owner should able to create a proposal to transfer 1 wei', async () => {
    await contractMultiSig.connect(accounts[0]).createProposal({
      delegate: false,
      expired: 0,
      target: accounts[9].address,
      executed: false,
      value: 1,
      data: '0x',
      vote: 0,
    });
  });

  it('some random guy should not able to create a proposal', async () => {
    let error = false;
    try {
      await contractMultiSig.connect(accounts[8]).createProposal({
        delegate: false,
        expired: 0,
        target: await accounts[9].getAddress(),
        executed: false,
        value: 0,
        data: '0x',
        vote: 0,
      });
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('all owners accounts should able to vote a proposal', async () => {
    for (let i = 0; i < 4; i += 1) {
      await contractMultiSig.connect(accounts[i]).votePositive(1);
      expect(await contractMultiSig.isVoted(1, accounts[0].address)).to.eq(true);
    }
  });

  it('owner should able to execute a proposal', async () => {
    await timeTravel();
    await contractMultiSig.connect(accounts[3]).execute(1);
    console.log('\t', (await hre.ethers.provider.getBalance(accounts[9].address)).toString());
  });

  it('owner should not able to execute the executed proposal', async () => {
    let error = false;
    try {
      await contractMultiSig.connect(accounts[3]).execute(1);
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('owner should able to create ERC20 transfer proposal', async () => {
    await contractMultiSig.connect(accounts[2]).createProposal({
      delegate: false,
      expired: 0,
      target: contractTestToken.address,
      executed: false,
      value: 0,
      data: contractTestToken.interface.encodeFunctionData('transfer', [accounts[9].address, '0x01']),
      vote: 0,
    });
  });

  it('owners should able to vote a proposal', async () => {
    await contractMultiSig.connect(accounts[0]).votePositive(2);
    expect(await contractMultiSig.isVoted(2, accounts[0].address)).to.eq(true);
    await contractMultiSig.connect(accounts[1]).votePositive(2);
    expect(await contractMultiSig.isVoted(2, accounts[1].address)).to.eq(true);
  });

  it('accounts should able to execute ERC20 transfer proposal', async () => {
    await timeTravel();
    await contractMultiSig.connect(accounts[3]).execute(2);
    console.log('\t', (await contractTestToken.balanceOf(accounts[9].address)).toString());
  });

  it('Owner should able to create another proposal', async () => {
    await contractMultiSig.createProposal({
      delegate: false,
      expired: 0,
      target: contractTestToken.address,
      executed: false,
      value: 0,
      data: contractTestToken.interface.encodeFunctionData('transfer', [accounts[9].address, '0x01']),
      vote: 0,
    });
  });

  it('accounts should able to vote a proposal', async () => {
    await contractMultiSig.connect(accounts[0]).votePositive(3);
    expect(await contractMultiSig.isVoted(3, accounts[0].address)).to.eq(true);

    await contractMultiSig.connect(accounts[1]).votePositive(3);
    expect(await contractMultiSig.isVoted(3, accounts[1].address)).to.eq(true);

    await contractMultiSig.connect(accounts[2]).voteNegative(3);
    expect(await contractMultiSig.isVoted(3, accounts[2].address)).to.eq(true);
  });

  it('Random guy should not able to vote a proposal', async () => {
    let error = false;
    try {
      await contractMultiSig.connect(accounts[7]).voteNegative(3);
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
    expect(await contractMultiSig.isVoted(3, accounts[7].address)).to.eq(false);
  });

  it('accounts should not able to execute proposal since not enough vote', async () => {
    await timeTravel();
    let error = false;
    try {
      await contractMultiSig.connect(accounts[3]).execute(3);
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('owner should able to create another proposal', async () => {
    await contractMultiSig.connect(accounts[3]).createProposal({
      delegate: false,
      expired: 0,
      target: contractTestToken.address,
      executed: false,
      value: 0,
      data: contractTestToken.interface.encodeFunctionData('transfer', [accounts[9].address, '0x01']),
      vote: 0,
    });
  });

  it('owners should not able to vote expired proposal', async () => {
    await timeTravel();
    let error = false;
    try {
      await contractMultiSig.connect(accounts[2]).votePositive(4);
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('owner should able to create another proposal', async () => {
    await contractMultiSig.createProposal({
      delegate: false,
      expired: 0,
      target: contractTestToken.address,
      executed: false,
      value: 0,
      data: contractTestToken.interface.encodeFunctionData('transfer', [accounts[9].address, '0x01']),
      vote: 0,
    });
  });

  it('owners should able to vote a proposal', async () => {
    await contractMultiSig.connect(accounts[0]).votePositive(5);
    expect(await contractMultiSig.isVoted(5, accounts[0].address)).to.eq(true);

    await contractMultiSig.connect(accounts[1]).voteNegative(5);
    expect(await contractMultiSig.isVoted(5, accounts[1].address)).to.eq(true);

    await contractMultiSig.connect(accounts[2]).voteNegative(5);
    expect(await contractMultiSig.isVoted(5, accounts[2].address)).to.eq(true);

    await contractMultiSig.connect(accounts[3]).voteNegative(5);
    expect(await contractMultiSig.isVoted(5, accounts[3].address)).to.eq(true);
  });

  it('accounts should not able to execute proposal since not enough vote', async () => {
    await timeTravel();
    let error = false;
    try {
      await contractMultiSig.connect(accounts[3]).execute(5);
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('owner should execute proposal immediately since 70% passed regardless proposal is expired or not', async () => {
    await contractMultiSig.createProposal({
      delegate: false,
      expired: 0,
      target: contractTestToken.address,
      executed: false,
      value: 0,
      data: contractTestToken.interface.encodeFunctionData('transfer', [accounts[9].address, '0x01']),
      vote: 0,
    });

    await contractMultiSig.connect(accounts[0]).votePositive(6);
    expect(await contractMultiSig.isVoted(5, accounts[0].address)).to.eq(true);

    await contractMultiSig.connect(accounts[1]).votePositive(6);
    expect(await contractMultiSig.isVoted(5, accounts[1].address)).to.eq(true);

    await contractMultiSig.connect(accounts[2]).votePositive(6);
    expect(await contractMultiSig.isVoted(5, accounts[2].address)).to.eq(true);

    let error = false;
    try {
      await contractMultiSig.connect(accounts[3]).execute(5);
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('owners should able to do quick transfer with all valid proof', async () => {
    const buf = BytesBuffer.newInstance()
      .writeUint256((await contractMultiSig.getNextValidNonce()).toHexString())
      .writeAddress(contractTestToken.address)
      .writeBytes(contractTestToken.interface.encodeFunctionData('transfer', [accounts[9].address, 2]))
      .invoke();
    const proofs = [];
    for (let i = 0; i < 3; i += 1) {
      proofs.push(await accounts[i].signMessage(buf));
    }
    const txResult = await (await contractMultiSig.connect(accounts[3]).quickTransfer(proofs, buf)).wait();
    console.log(contractMultiSig.address, '->', accounts[9].address);
    console.log(
      txResult.logs
        .filter((e) => e.topics[0] === utils.id('Transfer(address,address,uint256)'))
        .map((e) => {
          return contractTestToken.interface.decodeEventLog('Transfer', e.data, e.topics);
        })
        .map((e) => {
          const { from, to, value } = e;
          return `Transfer(${[from, to, BigNumber.from(value).toHexString()].join(', ')})`;
        })
        .join('\n'),
      `\n${txResult.gasUsed.toString()} Gas`,
    );
  });

  it('owners should not able to do quick transfer with invalid valid proof', async () => {
    const buf = BytesBuffer.newInstance()
      .writeUint256((await contractMultiSig.getNextValidNonce()).toHexString())
      .writeAddress(contractTestToken.address)
      .writeBytes(contractTestToken.interface.encodeFunctionData('transfer', [accounts[9].address, 2]))
      .invoke();
    const proofs = [];
    for (let i = 0; i < 2; i += 1) {
      proofs.push(await accounts[i].signMessage(buf));
    }
    let error = false;
    try {
      await (await contractMultiSig.connect(accounts[3]).quickTransfer(proofs, buf)).wait();
    } catch (e: any) {
      console.log(`\t${e.message}`);
      error = true;
    }
    expect(error).to.eq(true);
  });
});
