import hre from 'hardhat';
import chai, { expect } from 'chai';
import { contractDeploy, randInt } from './helpers/functions';
import { TestToken, MultiSig } from '../typechain';
import { Signer } from 'ethers';
import { solidity } from 'ethereum-waffle';

chai.use(solidity);

async function timeTravel() {
  await hre.network.provider.request({
    method: 'evm_increaseTime',
    params: [345600],
  });
}

let owners: Signer[],
  addressOwners: string[] = [],
  contractMultiSig: MultiSig,
  contractTestToken: TestToken;

describe('MultiSig', function () {
  it('MultiSig must be deployed correctly', async () => {
    owners = await hre.ethers.getSigners();
    for (let i = 0; i < owners.length; i += 1) {
      addressOwners.push(await owners[i].getAddress());
    }

    contractTestToken = <TestToken>await contractDeploy(owners[0], 'Duelist King/TestToken');
    contractMultiSig = <MultiSig>await contractDeploy(owners[0], 'Duelist King/MultiSig', addressOwners.slice(0, 4));

    await owners[0].sendTransaction({
      to: contractMultiSig.address,
      value: 1000000,
    });

    await contractTestToken.transfer(contractMultiSig.address, 1000000);
  });

  it('Owner should able to create a proposal', async () => {
    await contractMultiSig.createProposal({
      delegate: false,
      expired: 0,
      target: await owners[9].getAddress(),
      executed: false,
      value: 1,
      data: '0x',
      vote: 0,
    });
  });

  it('Random guy should not able to create a proposal', async () => {
    let error = false;
    try {
      await contractMultiSig.connect(owners[8]).createProposal({
        delegate: false,
        expired: 0,
        target: await owners[9].getAddress(),
        executed: false,
        value: 0,
        data: '0x',
        vote: 0,
      });
    } catch (e) {
      console.log(e.message);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('Owners should able to vote a proposal', async () => {
    for (let i = 0; i < 4; i += 1) {
      await contractMultiSig.connect(owners[i]).voteProposal(1, true);
      expect(await contractMultiSig.isVoted(1, addressOwners[0])).to.eq(true);
    }
  });

  it('Owners should able to execute a proposal', async () => {
    await timeTravel();
    await contractMultiSig.connect(owners[3]).execute(1);
    console.log('\t', (await hre.ethers.provider.getBalance(addressOwners[9])).toString());
  });

  it('Owner should not able to execute the executed proposal', async () => {
    let error = false;
    try {
      await contractMultiSig.connect(owners[3]).execute(1);
    } catch (e) {
      console.log(e.message);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('Owner should able to create ERC20 transfer proposal', async () => {
    await contractMultiSig.createProposal({
      delegate: false,
      expired: 0,
      target: contractTestToken.address,
      executed: false,
      value: 0,
      data: contractTestToken.interface.encodeFunctionData('transfer', [addressOwners[9], '0x01']),
      vote: 0,
    });
  });

  it('Owners should able to vote a proposal', async () => {
    await contractMultiSig.connect(owners[0]).voteProposal(2, true);
    expect(await contractMultiSig.isVoted(2, addressOwners[0])).to.eq(true);
    await contractMultiSig.connect(owners[1]).voteProposal(2, true);
    expect(await contractMultiSig.isVoted(2, addressOwners[1])).to.eq(true);
  });

  it('Owners should able to execute ERC20 transfer proposal', async () => {
    await timeTravel();
    await contractMultiSig.connect(owners[3]).execute(2);
    console.log('\t', (await contractTestToken.balanceOf(addressOwners[9])).toString());
  });

  it('Owner should able to create another proposal', async () => {
    await contractMultiSig.createProposal({
      delegate: false,
      expired: 0,
      target: contractTestToken.address,
      executed: false,
      value: 0,
      data: contractTestToken.interface.encodeFunctionData('transfer', [addressOwners[9], '0x01']),
      vote: 0,
    });
  });

  it('Owners should able to vote a proposal', async () => {
    await contractMultiSig.connect(owners[0]).voteProposal(3, true);
    expect(await contractMultiSig.isVoted(3, addressOwners[0])).to.eq(true);

    await contractMultiSig.connect(owners[1]).voteProposal(3, true);
    expect(await contractMultiSig.isVoted(3, addressOwners[1])).to.eq(true);

    await contractMultiSig.connect(owners[2]).voteProposal(3, false);
    expect(await contractMultiSig.isVoted(3, addressOwners[2])).to.eq(true);
  });

  it('Random guy should not able to vote a proposal', async () => {
    let error = false;
    try {
      await contractMultiSig.connect(owners[7]).voteProposal(3, false);
    } catch (e) {
      console.log(e.message);
      error = true;
    }
    expect(error).to.eq(true);
    expect(await contractMultiSig.isVoted(3, addressOwners[7])).to.eq(false);
  });

  it('Owners should not able to execute proposal since not enough vote', async () => {
    await timeTravel();
    let error = false;
    try {
      await contractMultiSig.connect(owners[3]).execute(3);
    } catch (e) {
      console.log(e.message);
      error = true;
    }
    expect(error).to.eq(true);
  });

  it('Owner should able to create another proposal', async () => {
    await contractMultiSig.connect(owners[3]).createProposal({
      delegate: false,
      expired: 0,
      target: contractTestToken.address,
      executed: false,
      value: 0,
      data: contractTestToken.interface.encodeFunctionData('transfer', [addressOwners[9], '0x01']),
      vote: 0,
    });
  });

  it('Owners should not able to vote expired proposal', async () => {
    await timeTravel();
    let error = false;
    try {
      await contractMultiSig.connect(owners[2]).voteProposal(4, true);
    } catch (e) {
      console.log(e.message);
      error = true;
    }
    expect(error).to.eq(true);
  });



  it('Owner should able to create another proposal', async () => {
    await contractMultiSig.createProposal({
      delegate: false,
      expired: 0,
      target: contractTestToken.address,
      executed: false,
      value: 0,
      data: contractTestToken.interface.encodeFunctionData('transfer', [addressOwners[9], '0x01']),
      vote: 0,
    });
  });

  it('Owners should able to vote a proposal', async () => {
    await contractMultiSig.connect(owners[0]).voteProposal(5, true);
    expect(await contractMultiSig.isVoted(5, addressOwners[0])).to.eq(true);

    await contractMultiSig.connect(owners[1]).voteProposal(5, false);
    expect(await contractMultiSig.isVoted(5, addressOwners[1])).to.eq(true);

    await contractMultiSig.connect(owners[2]).voteProposal(5, false);
    expect(await contractMultiSig.isVoted(5, addressOwners[2])).to.eq(true);

    await contractMultiSig.connect(owners[3]).voteProposal(5, false);
    expect(await contractMultiSig.isVoted(5, addressOwners[3])).to.eq(true);
  });

  it('Owners should not able to execute proposal since not enough vote', async () => {
    await timeTravel();
    let error = false;
    try {
      await contractMultiSig.connect(owners[3]).execute(5);
    } catch (e) {
      console.log(e.message);
      error = true;
    }
    expect(error).to.eq(true);
  });
});
