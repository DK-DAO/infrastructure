// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
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
  mapping(address => uint256) private nonce;

  // List partner
  event ListPartner(address partnerAddress);

  // Delist partner
  event DelistPartner(address partnerAddress);

  modifier onlyPartner() {
    require(partners[msg.sender] == true, 'Swap: Sender was not partner');
    _;
  }

  // Pass constructor parameter to User
  constructor(address _registry, bytes32 _domain) {
    _init(_registry, _domain);
  }

  function delegateTransfer(
    address from,
    uint256 to,
    bytes memory proof
  ) external onlyPartner returns (bool) {}

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
    return nonce[owner];
  }
}
