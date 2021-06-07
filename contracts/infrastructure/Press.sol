// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/INFT.sol';
import '../libraries/User.sol';
import '../libraries/Item.sol';

/**
 * Item manufacture
 * Name: Press
 * Domain: DKDAO Infrastructure
 */
contract Press is User {
  // Using Item library for uint256
  using Item for uint256;

  // Application index, it will be used as application's ID
  // Maximum is 2^64-1
  uint256 private applicationIndex = 0;

  // Registed distributors
  mapping(bytes32 => mapping(bytes32 => uint256)) private registedDistributors;

  // We only allow call from registed distributor on Registry
  modifier onlyAllowExistedDistributor(bytes32 _domain) {
    require(registry.isExistRecord(_domain, bytes32('Distributor')), 'Press: Distributor was not existed');
    _;
  }

  // Pass constructor parameter to User
  constructor(address _registry, bytes32 _domain) {
    init(_registry, _domain);
  }

  // Allow another distributor of other domain to trigger item creation
  function createItem(
    bytes32 _domain,
    address _owner,
    uint256 _itemId
  ) external onlyAllowExistedDistributor(_domain) returns (bool) {
    uint256 appId = registedDistributors[_domain][bytes32('Distributor')];
    // If application id wasn't assigned
    if (appId == 0) {
      applicationIndex += 1;
      appId = applicationIndex;
      registedDistributors[_domain][bytes32('Distributor')] = appId;
    }
    // Item application's id will be overwrited no matter what
    return INFT(getAddressSameDomain(bytes32('NFT'))).mint(_owner, _itemId.setApplicationId(appId));
  }

  // Get application id of domain
  function getApplicationId(bytes32 _domain) external view returns (uint256) {
    return registedDistributors[_domain][bytes32('Distributor')];
  }
}
