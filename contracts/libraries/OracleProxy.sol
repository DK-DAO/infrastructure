// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../libraries/User.sol';

/**
 * Oracle Proxy
 * Name: Oracle
 * Domain: *
 */
contract OracleProxy is Ownable {
  // Use address lib for address
  using Address for address;

  // Controller list
  mapping(address => bool) controllers;

  // List controller
  event ListAddress(address indexed addr);

  // Delist controller
  event DelistAddress(address indexed addr);

  // Only allow listed oracle to trigger oracle proxy
  modifier onlyListedController() {
    require(controllers[msg.sender], 'OracleProxy: Controller was not in the list');
    _;
  }

  // Add real Oracle to controller list
  function addController(address controllerAddr) external returns (bool) {
    controllers[controllerAddr] = true;
    emit ListAddress(controllerAddr);
    return true;
  }

  // Remove real Oracle from controller list
  function removeController(address controllerAddr) external returns (bool) {
    controllers[controllerAddr] = false;
    emit DelistAddress(controllerAddr);
    return true;
  }

  // Safe call to a target address with given payload
  function safeCall(
    address target,
    uint256 value,
    bytes memory data
  ) external onlyListedController returns (bool) {
    target.functionCallWithValue(data, value);
    return true;
  }

  // Delegatecall to a target address with given payload
  function safeDelegateCall(address target, bytes calldata data) external onlyListedController returns (bool) {
    target.functionDelegateCall(data);
    return true;
  }
}
