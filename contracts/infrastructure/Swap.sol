// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/INFT.sol';
import '../libraries/Bytes.sol';
import '../libraries/Verifier.sol';
import '../libraries/User.sol';

/**
 * Swap able to transfer token by
 * Name: Swap
 * Domain: DKDAO Infrastructure
 */
contract Swap is User, Ownable {
  using Verifier for bytes;
  using Bytes for bytes;

  // Partner of duelistking
  mapping(address => bool) private partners;

  // Nonce
  mapping(address => uint256) private nonceStorage;

  // List partner
  event ListPartner(address partnerAddress);

  // Delist partner
  event DelistPartner(address partnerAddress);

  // Only allow partner to execute
  modifier onlyPartner() {
    require(partners[msg.sender] == true, 'Swap: Sender was not partner');
    _;
  }

  // Pass constructor parameter to User
  constructor(address _registry, bytes32 _domain) {
    _init(_registry, _domain);
  }

  // User able to delegate transfer right with a cyrptographic proof
  function delegateTransfer(bytes memory proof) external onlyPartner returns (bool) {
    // Check for size of the proof
    require(proof.length == 149, 'Swap: Wrong size of the proof, it must be 149 bytes');
    bytes memory signature = proof.readBytes(0, 65);
    bytes memory message = proof.readBytes(65, proof.length - 65);
    address _from = message.verifySerialized(signature);
    address _to = message.readAddress(0);
    uint256 _value = message.readUint256(20);
    uint256 _nonce = message.readUint256(52);
    // Each nonce is only able to be use once
    require(_nonce - nonceStorage[_from] == 1, 'Swap: Incorrect nonce of signer');
    nonceStorage[_from] += 1;
    return INFT(getAddressSameDomain('NFT')).safeTransfer(_from, _to, _value);
  }

  // List a new partner
  function listPartner(address partnerAddress) external onlyOwner returns (bool) {
    partners[partnerAddress] = true;
    emit ListPartner(partnerAddress);
    return true;
  }

  // Delist a partner
  function delistPartner(address partnerAddress) external onlyOwner returns (bool) {
    partners[partnerAddress] = false;
    emit DelistPartner(partnerAddress);
    return true;
  }

  // Get nonce of an address
  function getNonce(address owner) external view returns (uint256) {
    return nonceStorage[owner] + 1;
  }
}
