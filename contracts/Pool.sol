// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './User.sol';

/**
 * Only allow a DAO in the same domain to call them
 * That's mean another DAO has no power here even GrandDAO
 */
contract Pool is User, Ownable {
  // Constructor with registry and domain
  constructor(address _registry, bytes32 _domain) User(_registry, _domain) {}

  // Safe call to a target address with given payload
  function safeCall(
    address target,
    uint256 value,
    bytes calldata data
  ) external onlyAllowSameDomain(bytes32('DAO')) returns (bool) {
    (bool success, bytes memory returnData) = target.call{ value: value, gas: (gasleft() - 5000) }(data);
    require(success, string(returnData));
    return true;
  }

  // Delegatecall to a target address with given payload
  function safeDelegateCall(address target, bytes calldata data)
    external
    onlyAllowSameDomain(bytes32('DAO'))
    returns (bool)
  {
    (bool success, bytes memory returnData) = target.delegatecall{ gas: (gasleft() - 5000) }(data);
    require(success, string(returnData));
    return true;
  }
}
