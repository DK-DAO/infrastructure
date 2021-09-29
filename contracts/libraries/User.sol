// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '../interfaces/IRegistry.sol';

abstract contract User {
  // Registry contract
  IRegistry internal _registry;

  // Active domain
  bytes32 internal _domain;

  // Allow same domain calls
  modifier onlyAllowSameDomain(bytes32 name) {
    require(msg.sender == _registry.getAddress(_domain, name), 'User: Only allow call from same domain');
    _;
  }

  // Allow cross domain call
  modifier onlyAllowCrossDomain(bytes32 fromDomain, bytes32 name) {
    require(msg.sender == _registry.getAddress(fromDomain, name), 'User: Only allow call from allowed cross domain');
    _;
  }

  // Constructing with registry address and its active domain
  function _registryUserInit(address registry_, bytes32 domain_) internal returns (bool) {
    require(_domain == bytes32(0) && address(_registry) == address(0), "User: It's only able to set once");
    _registry = IRegistry(registry_);
    _domain = domain_;
    return true;
  }

  // Get address in the same domain
  function getAddressSameDomain(bytes32 name) internal view returns (address) {
    return _registry.getAddress(_domain, name);
  }

  // Return active domain
  function getDomain() external view returns (bytes32) {
    return _domain;
  }

  // Return registry address
  function getRegistry() external view returns (address) {
    return address(_registry);
  }
}
