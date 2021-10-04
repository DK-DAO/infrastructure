// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/utils/Address.sol';
import './Verifier.sol';
import './Bytes.sol';
import './User.sol';

/**
 * Oracle Proxy
 * Name: Oracle
 * Domain: *
 */
contract OracleProxy is User {
  // Verify signature
  using Bytes for bytes;

  // Verify signature
  using Verifier for bytes;

  // Use address lib for address
  using Address for address;

  // Controller list
  mapping(address => bool) private _controllers;

  // Nonce storatge
  mapping(address => uint256) private _nonceStorage;

  // List controller
  event ListAddress(address indexed addr);

  // Delist controller
  event DelistAddress(address indexed addr);

  constructor(address registry_, bytes32 domain_) {
    // Set the operator
    _registryUserInit(registry_, domain_);
  }

  // Only allow listed oracle to trigger oracle proxy
  modifier onlyListedController(bytes memory proof) {
    require(proof.length == 97, 'Swap: Wrong size of the proof, it must be 97 bytes');
    bytes memory signature = proof.readBytes(0, 65);
    bytes memory message = proof.readBytes(65, 32);
    address sender = message.verifySerialized(signature);
    uint256 timeAndNonce = message.readUint256(0);
    uint256 nonce = uint128(timeAndNonce);
    uint256 time = timeAndNonce >> 128;
    require(nonce - _nonceStorage[sender] == 1, 'OracleProxy: Nonce value is invalid');
    require(time < block.timestamp, 'OracleProxy: This proof was expired');
    require(_controllers[sender], 'OracleProxy: Controller was not in the list');
    _nonceStorage[sender] += 1;
    _;
  }

  /*******************************************************
   * Operator section
   ********************************************************/

  // Add real Oracle to controller list
  function addController(address controllerAddr) external onlyAllowSameDomain('Operator') returns (bool) {
    _controllers[controllerAddr] = true;
    emit ListAddress(controllerAddr);
    return true;
  }

  // Remove real Oracle from controller list
  function removeController(address controllerAddr) external onlyAllowSameDomain('Operator') returns (bool) {
    _controllers[controllerAddr] = false;
    emit DelistAddress(controllerAddr);
    return true;
  }

  /*******************************************************
   * Public section
   ********************************************************/

  // Safe call to a target address with given payload
  function safeCall(
    bytes memory proof,
    address target,
    uint256 value,
    bytes memory data
  ) external onlyListedController(proof) returns (bool) {
    target.functionCallWithValue(data, value);
    return true;
  }

  // Delegatecall to a target address with given payload
  function safeDelegateCall(
    bytes memory proof,
    address target,
    bytes calldata data
  ) external onlyListedController(proof) returns (bool) {
    target.functionDelegateCall(data);
    return true;
  }

  /*******************************************************
   * View section
   ********************************************************/

  // Get valid nonce of next transaction
  function getValidNonce(address inputAddress) external view returns (uint256) {
    return _nonceStorage[inputAddress] + 1;
  }

  // Check a address is controller
  function isController(address inputAddress) external view returns (bool) {
    return _controllers[inputAddress];
  }
}
