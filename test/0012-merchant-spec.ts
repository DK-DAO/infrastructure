import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import hre, { ethers } from 'hardhat';
import { DuelistKingMerchant, IRegistry, TestToken } from '../typechain';
import Deployer from './helpers/deployer';
import { registryRecords } from './helpers/const';
import { BigNumber } from 'ethers';

chai.use(solidity);
const decimals = BigNumber.from('10').pow(18);

let stableToken: TestToken, dummyToken: TestToken;
let salesAgent: SignerWithAddress,
  infrastructureOperator: SignerWithAddress,
  merchantOperator: SignerWithAddress,
  merchantContract: DuelistKingMerchant;
let user1: SignerWithAddress, user2: SignerWithAddress;

function dayToSec(days: number) {
  return Math.round(days * 86400);
}

async function timeTravel(secs: number) {
  await hre.network.provider.request({
    method: 'evm_increaseTime',
    params: [secs],
  });
  await hre.network.provider.request({
    method: 'evm_mine',
    params: [],
  });
}

describe.only('DKMerchant', function () {
  this.beforeAll('Before init', async function () {
    const accounts = await ethers.getSigners();
    infrastructureOperator = accounts[1];
    salesAgent = accounts[2];
    merchantOperator = accounts[3];

    user1 = accounts[4];
    user2 = accounts[5];

    const deployer: Deployer = Deployer.getInstance(hre);
    stableToken = <TestToken>await deployer.connect(accounts[0]).contractDeploy('test/TestToken', []);
    dummyToken = <TestToken>await deployer.connect(accounts[0]).contractDeploy('test/TestToken', []);

    // Deploy registry contract for testing
    const registryContract = <IRegistry>(
      await deployer.connect(infrastructureOperator).contractDeploy('Infrastructure/Registry', [])
    );

    /**
     * Register new operator in registry contract
     * salesAgent & merchantOperator in Dueliking domain,
     * infrastructureOperator in Infrastructure domain
     */

    await registryContract.set(registryRecords.domain.duelistKing, registryRecords.name.salesAgent, salesAgent.address);
    await registryContract.set(
      registryRecords.domain.duelistKing,
      registryRecords.name.merchant,
      merchantOperator.address,
    );

    await registryContract.set(
      registryRecords.domain.infrastructure,
      registryRecords.name.operator,
      infrastructureOperator.address,
    );
    merchantContract = <DuelistKingMerchant>(
      await deployer
        .connect(merchantOperator)
        .contractDeploy(
          'Duelist King/DuelistKingMerchant',
          [],
          registryContract.address,
          registryRecords.domain.duelistKing,
        )
    );
  });

  it('Initialize', async function () {
    await stableToken.transfer(user1.address, BigNumber.from('2000').mul(decimals));
    await stableToken.transfer(user2.address, BigNumber.from('1000').mul(decimals));
    await dummyToken.transfer(user1.address, BigNumber.from('200').mul(decimals));

    await stableToken.connect(user1).approve(merchantContract.address, BigNumber.from('2000').mul(decimals));
    await dummyToken.connect(user1).approve(merchantContract.address, BigNumber.from('200').mul(decimals));
  });

  it('Should be failed when creating a new campaign because invalid Sales Agent', async function () {
    const blocktime = BigNumber.from(Math.round(new Date(Date.now()).getTime() / 1000 - 1800));
    console.log(blocktime);
    const config = {
      phaseId: 4,
      totalSale: 200,
      basePrice: 15,
      deadline: blocktime.add(Math.round(3 * 86400)),
    };
    await expect(merchantContract.connect(infrastructureOperator).createNewCampaign(config)).to.be.revertedWith(
      'UserRegistry: Only allow call from same domain',
    );
    await expect(merchantContract.connect(user1).createNewCampaign(config)).to.be.revertedWith(
      'UserRegistry: Only allow call from same domain',
    );
  });
});
