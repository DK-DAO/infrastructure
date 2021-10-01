// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '../libraries/User.sol';

/**
 * DKDAO domain name system
 * Name: Registry
 * Domain: DKDAO
 */
contract Registry is User {
  // Mapping bytes32 -> address
  mapping(bytes32 => mapping(bytes32 => address)) private registered;

  // Mapping address -> bytes32 name
  mapping(address => bytes32) private revertedName;

  // Mapping address -> bytes32 domain
  mapping(address => bytes32) private revertedDomain;

  // Event when new address registered
  event RecordSet(bytes32 domain, bytes32 indexed name, address indexed addr);

  constructor() {
    // Set the operator
    _set('DKDAO', 'Operator', msg.sender);
    _set('DKDAO', 'Registry', address(this));
    _registryUserInit(address(this), 'DKDAO');
  }

  // Set a record
  function set(
    bytes32 domain,
    bytes32 name,
    address addr
  ) external onlyAllowSameDomain('Operator') returns (bool) {
    return _set(domain, name, addr);
  }

  // Set many records at once
  function batchSet(
    bytes32[] calldata domains,
    bytes32[] calldata names,
    address[] calldata addrs
  ) external onlyAllowSameDomain('Operator') returns (bool) {
    require(
      domains.length == names.length && names.length == addrs.length,
      'Registry: Number of records and addreses must be matched'
    );
    for (uint256 i = 0; i < names.length; i += 1) {
      require(_set(domains[i], names[i], addrs[i]), 'Registry: Unable to set records');
    }
    return true;
  }

  // Check is record existed
  function isExistRecord(bytes32 domain, bytes32 name) external view returns (bool) {
    return registered[domain][name] != address(0);
  }

  // Get address by name
  function getAddress(bytes32 domain, bytes32 name) external view returns (address) {
    return registered[domain][name];
  }

  // Get name by address
  function getDomainAndName(address addr) external view returns (bytes32, bytes32) {
    return (revertedDomain[addr], revertedName[addr]);
  }

  // Set record internally
  function _set(
    bytes32 domain,
    bytes32 name,
    address addr
  ) internal returns (bool) {
    require(addr != address(0), "Registry: We don't allow zero address");
    registered[domain][name] = addr;
    revertedName[addr] = name;
    revertedDomain[addr] = domain;
    emit RecordSet(domain, name, addr);
    return true;
  }
}
