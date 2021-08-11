// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '../libraries/User.sol';

/**
 * Only allow Press to mint new token following domain
 * Distributor will work with NFT through Press'
 * Name: NFT
 * Domain: DKDAO Infrastructure
 */
contract NFT is User, ERC721('DKDAO Items', 'DKDAOI') {
  // Pass constructor parameter to User
  constructor(address _registry, bytes32 _domain) {
    _init(_registry, _domain);
  }

  // Only press able to mint new item
  function mint(address to, uint256 tokenId) external onlyAllowSameDomain('Press') returns (bool) {
    _mint(to, tokenId);
    return _exists(tokenId);
  }

  // Allow swap to perform transfer
  function safeTransfer(
    address from,
    address to,
    uint256 tokenId
  ) external onlyAllowSameDomain('Swap') returns (bool) {
    _transfer(from, to, tokenId);
    return true;
  }
}
