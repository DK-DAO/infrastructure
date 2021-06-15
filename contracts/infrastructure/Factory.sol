// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/proxy/Clones.sol';
import '../interfaces/IUser.sol';
import '../interfaces/IDAOToken.sol';
import '../libraries/User.sol';
import '../libraries/TokenMetadata.sol';

/**
 * Item manufacture
 * Name: Factory
 * Domain: DKDAO Infrastructure
 */
contract Factory is User {
  // Use clone lib for address
  using Clones for address;

  // New DAO data
  struct NewDAO {
    bytes32 domain;
    TokenMetadata.Metadata tokenMetadata;
  }

  // Pass constructor parameter to User
  constructor(address _registry, bytes32 _domain) {
    init(_registry, _domain);
  }

  function cloneNewDAO(NewDAO calldata creatingDAO)
    external
    onlyAllowCrossDomain('DKDAO', 'DAO')
    returns (bool)
  {
    // New DAO will be cloned from KDDAO
    address newDAO = registry.getAddress('DKDAO', 'DAO').clone();
    IUser(newDAO).init(address(registry), creatingDAO.domain);

    // New DAO Token will be cloned from DKDAOToken
    address newDAOToken = registry.getAddress('DKDAO', 'DAOToken').clone();
    IDAOToken(newDAOToken).init(creatingDAO.tokenMetadata);

    // New Pool will be clone from
    address newPool = registry.getAddress('DKDAO', 'Pool').clone();
    IUser(newPool).init(address(registry), creatingDAO.domain);

    return true;
  }
}
