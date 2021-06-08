import hre from 'hardhat';
import { expect } from 'chai';
import { Signer } from 'ethers';
import { contractDeploy, stringToBytes32 } from './helpers/functions';
import { Registry, RNG } from '../typechain';
import { registryRecords } from './helpers/const';

let owner: Signer, oracle: Signer, contractRNG: RNG, contractRegistry: Registry;

describe('RNG', () => {
  it('should able to deploy rng correct', async () => {
    [owner, oracle] = await hre.ethers.getSigners();
    contractRegistry = <Registry>await contractDeploy(owner, 'DKDAO Infrastructure/Registry');
    contractRNG = <RNG>(
      await contractDeploy(owner, 'DKDAO Infrastructure/RNG', contractRegistry.address, registryRecords.name.rng)
    );
  });
});
