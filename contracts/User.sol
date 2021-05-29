// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './Registry.sol';

abstract contract User {
  // Registry contract
  Registry internal immutable registry;

  // Active domain
  bytes32 internal immutable domain;

  // Allow same domain calls
  modifier onlyAllowSameDomain(bytes32 name) {
    require(msg.sender == registry.getAddress(domain, name), 'User: Only allow call from same domain');
    _;
  }

  // Allow cross domain call
  modifier onlyAllowCrossDomain(bytes32 fromDomain, bytes32 name) {
    require(msg.sender == registry.getAddress(fromDomain, name), 'User: Only allow call from allowed cross domain');
    _;
  }

  // Constructing with registry address and its active domain
  constructor(address _registry, bytes32 _domain) {
    registry = Registry(_registry);
    domain = _domain;
  }

  // Return active domain
  function getDomain() external view returns (bytes32) {
    return domain;
  }

  // Return registry address
  function getRegistry() external view returns (address) {
    return address(registry);
  }
}
