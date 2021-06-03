// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './libraries/User.sol';

/**
 * Profit Pool
 * Name: Pool
 * Domain: DKDAO, *
 */
contract Pool is User, Ownable {
  // Use address lib for address
  using Address for address;

  // Safe call to a target address with given payload
  function safeCall(
    address target,
    uint256 value,
    bytes memory data
  ) external onlyAllowSameDomain(bytes32('DAO')) returns (bool) {
    target.functionCallWithValue(data, value);
    return true;
  }

  // Delegatecall to a target address with given payload
  function safeDelegateCall(address target, bytes calldata data)
    external
    onlyAllowSameDomain(bytes32('DAO'))
    returns (bool)
  {
    target.functionDelegateCall(data);
    return true;
  }
}
