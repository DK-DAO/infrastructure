// Dependency file: contracts/interfaces/IRegistry.sol

// SPDX-License-Identifier: Apache-2.0
// pragma solidity >=0.8.4 <0.9.0;

interface IRegistry {
  event Registered(bytes32 domain, bytes32 indexed name, address indexed addr);

  function isExistRecord(bytes32 domain, bytes32 name) external view returns (bool);

  function set(
    bytes32 domain,
    bytes32 name,
    address addr
  ) external returns (bool);

  function batchSet(
    bytes32[] calldata domains,
    bytes32[] calldata names,
    address[] calldata addrs
  ) external returns (bool);

  function getAddress(bytes32 domain, bytes32 name) external view returns (address);

  function getDomainAndName(address addr) external view returns (bytes32, bytes32);
}


// Root file: contracts/libraries/User.sol

pragma solidity >=0.8.4 <0.9.0;

// import 'contracts/interfaces/IRegistry.sol';

abstract contract User {
  // Registry contract
  IRegistry internal registry;

  // Active domain
  bytes32 internal domain;

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
  function _init(address _registry, bytes32 _domain) internal returns (bool) {
    require(domain == bytes32(0) && address(registry) == address(0), "User: It's only able to set once");
    registry = IRegistry(_registry);
    domain = _domain;
    return true;
  }

  // Get address in the same domain
  function getAddressSameDomain(bytes32 name) internal view returns (address) {
    return registry.getAddress(domain, name);
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
