import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import hre, { ethers } from 'hardhat';
import { DuelistKingMerchant, IRegistry, TestToken } from '../typechain';
import Deployer from './helpers/deployer';
import { registryRecords } from './helpers/const';

chai.use(solidity);

let stableToken: TestToken, dummyToken: TestToken;
let salesAgent: SignerWithAddress,
  infrastructureOperator: SignerWithAddress,
  merchantOperator: SignerWithAddress,
  merchantContract: DuelistKingMerchant;
let buyer1: SignerWithAddress, buyer2: SignerWithAddress;

describe.only('DKMerchant', function () {
  this.beforeAll('Before init', async function () {
    const accounts = await ethers.getSigners();
    infrastructureOperator = accounts[1];
    salesAgent = accounts[2];
    merchantOperator = accounts[3];

    buyer1 = accounts[4];
    buyer2 = accounts[5];

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
});
