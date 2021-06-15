// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '../libraries/ERC721.sol';
import '../libraries/User.sol';

/**
 * Only allow Press to mint new token following domain
 * Distributor will work with NFT through Press'
 * Name: NFT
 * Domain: DKDAO Infrastructure
 */
contract NFT is ERC721 {
  // Only press able to mint new item
  function mint(address to, uint256 tokenId) external onlyAllowSameDomain('Distributor') returns (bool) {
    _mint(to, tokenId);
    return _exists(tokenId);
  }
}
