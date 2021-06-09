// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../libraries/User.sol';

/**
 * Only allow Press to mint new token following domain
 * Distributor will work with NFT through Press'
 * Name: NFT
 * Domain: DKDAO Infrastructure
 */
contract NFT is User, ERC721('DKDI', 'DKDAO Items'), Ownable {
  // Pass constructor parameter to User
  constructor(address _registry, bytes32 _domain) {
    init(_registry, _domain);
  }

  // Only press able to mint new item
  function mint(address to, uint256 tokenId) external onlyAllowSameDomain(bytes32('Press')) returns (bool) {
    _mint(to, tokenId);
    return _exists(tokenId);
  }
}