import hre from 'hardhat';
import chai, { expect } from 'chai';
import { TestToken, MultiSig, CardSaleWallet } from '../typechain';
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
let accounts: SignerWithAddress[], contractCardSaleWallet: CardSaleWallet, contractTestToken: TestToken;

describe('CardSaleWallet', function () {
  it('CardSaleWallet must be deployed correctly', async () => {
    accounts = await hre.ethers.getSigners();
    const deployer: Deployer = Deployer.getInstance(hre);
    deployer.connect(accounts[0]);
    contractTestToken = <TestToken>await deployer.contractDeploy('test/TestToken', []);
    contractCardSaleWallet = <CardSaleWallet>await deployer.contractDeploy(
      'test/CardSaleWallet',
      [],
      accounts[8].address,
      accounts.slice(0, 4).map((e) => e.address),
    );

    // It should return
    await accounts[0].sendTransaction({
      to: contractCardSaleWallet.address,
      value: 1000000,
    });

    expect((await hre.ethers.provider.getBalance(contractCardSaleWallet.address)).toNumber()).to.eq(0);

    await contractTestToken.transfer(contractCardSaleWallet.address, 1000000);
  });

  it('Owner should able to trigger withdraw', async () => {
    expect(() => contractCardSaleWallet.withdraw([contractTestToken.address])).changeTokenBalance(
      contractTestToken,
      accounts[8],
      1000000,
    );
  });
});
