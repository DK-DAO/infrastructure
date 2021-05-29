// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract Registry is Ownable {
  // Mapping bytes32 -> address
  mapping(bytes32 => mapping(bytes32 => address)) private registered;

  // Mapping address -> bytes32 name
  mapping(address => bytes32) private revertedName;

  // Mapping address -> bytes32 domain
  mapping(address => bytes32) private revertedDomain;

  // Event when new address registered
  event Registered(bytes32 domain, bytes32 indexed name, address indexed addr);

  // Set a record
  function set(
    bytes32 domain,
    bytes32 name,
    address addr
  ) external onlyOwner returns (bool) {
    return _set(domain, name, addr);
  }

  // Set many records at once
  function batchSet(
    bytes32[] calldata domains,
    bytes32[] calldata names,
    address[] calldata addrs
  ) external onlyOwner returns (bool) {
    require(
      domains.length == names.length && names.length == addrs.length,
      'Registry: Number of records and addreses must be matched'
    );
    for (uint256 i = 0; i < names.length; i += 1) {
      require(!_set(domains[i], names[i], addrs[i]), 'Registry: Unable to set records');
    }
    return true;
  }

  // Get address by name
  function getAddress(bytes32 domain, bytes32 name) external view returns (address) {
    return registered[domain][name];
  }

  // Get name by address
  function getDomainAndName(address addr) external view returns (bytes32, bytes32) {
    return (revertedName[addr], revertedDomain[addr]);
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
    emit Registered(domain, name, addr);
    return true;
  }
}