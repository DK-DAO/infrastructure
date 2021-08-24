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

  // Staking
  mapping(address => mapping(uint256 => uint256)) private stakingStorage;

  // List partner
  event ListPartner(address indexed partnerAddress);

  // Delist partner
  event DelistPartner(address indexed partnerAddress);

  // Start staking
  event StartStaking(address indexed owner, uint256 indexed tokenId, uint256 timestamp);

  // Stop staking
  event StopStaking(address indexed owner, uint256 indexed tokenId, uint256 timestamp);

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

  // Anyone could able to staking their good/items for their own sake
  function startStaking(bytes memory tokenIds) external returns (bool) {
    INFT nft = INFT(getAddressSameDomain('NFT'));
    require(tokenIds.length % 32 == 0, 'Swap: Staking Ids need to be divied by 32');
    for (uint256 i = 0; i < tokenIds.length; i += 32) {
      uint256 tokenId = tokenIds.readUint256(i);
      require(stakingStorage[msg.sender][tokenId] == 0, 'Swap: We are only able to stake, unstaked token');
      // Store starting point of staking
      stakingStorage[msg.sender][tokenId] = block.timestamp;
      emit StartStaking(msg.sender, tokenId, block.timestamp);
      require(
        nft.safeTransfer(msg.sender, 0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa, tokenId),
        'Swap: User should able to transfer their own token to staking address'
      );
    }
    return true;
  }

  // Anyone could able to stop staking their good/items for their own sake
  function stopStaking(bytes memory tokenIds) external returns (bool) {
    INFT nft = INFT(getAddressSameDomain('NFT'));
    require(tokenIds.length % 32 == 0, 'Swap: Staking Ids need to be divied by 32');
    for (uint256 i = 0; i < tokenIds.length; i += 32) {
      uint256 tokenId = tokenIds.readUint256(i);
      require(
        block.timestamp - stakingStorage[msg.sender][tokenId] > 1 days,
        'Swap: You only able to stop staking after at least 1 day'
      );
      require(stakingStorage[msg.sender][tokenId] > 0, 'Swap: You only able to stop staking staked token');
      // Reset staking state
      stakingStorage[msg.sender][tokenId] = 0;
      emit StopStaking(msg.sender, tokenId, block.timestamp);
      require(
        nft.safeTransfer(0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa, msg.sender, tokenId),
        'Swap: User should able to transfer their own token to staking address'
      );
    }
    return true;
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

  // Check an address is partner or not
  function isPartner(address partner) external view returns (bool) {
    return partners[partner];
  }

  // Get staking timestamp of given address and list of token Id
  function getStakingStatus(address owner, bytes memory tokenIds) external view returns (uint256[] memory) {
    require(tokenIds.length % 32 == 0, 'Swap: Staking Ids need to be divied by 32');
    uint256[] memory result = new uint256[](tokenIds.length / 32);
    for (uint256 i = 0; i < tokenIds.length; i += 1) {
      result[i] = stakingStorage[owner][tokenIds.readUint256(i * 32)];
    }
    return result;
  }
}
