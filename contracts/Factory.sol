// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './interfaces/IUser.sol';
import './interfaces/IRegistry.sol';
import './interfaces/IDAOToken.sol';
import './libraries/User.sol';
import './libraries/Clone.sol';
import './libraries/TokenMetadata.sol';
import './DAOToken.sol';
import './DAO.sol';
import './Pool.sol';

contract Factory is User, Ownable {
  using Clone for address;

  struct NewDAO {
    bytes32 domain;
    address registry;
    TokenMetadata.Metadata tokenMetadata;
  }

  function createNewDao(NewDAO calldata creatingDAO) external onlyOwner returns (bool) {
    address newDAO = registry.getAddress(bytes32('DKDAO'), 'DAO').clone();
    IUser(newDAO).init(address(registry), creatingDAO.domain);
    address newDAOToken = registry.getAddress(bytes32('DKDAO'), 'DAOToken').clone();
    IDAOToken(newDAOToken).init(creatingDAO.tokenMetadata);
    address newPool = registry.getAddress(bytes32('DKDAO'), 'Pool').clone();
    IUser(newPool).init(address(registry), creatingDAO.domain);
  }
}
