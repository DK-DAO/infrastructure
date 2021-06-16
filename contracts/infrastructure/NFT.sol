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
  /**
   * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
   */
  function nftInit(
    string memory name_,
    string memory symbol_,
    address registry,
    bytes32 domain
  ) external returns (bool) {
    require(init(registry, domain), 'ERC721: This method only able to be called once');
    _name = name_;
    _symbol = symbol_;
    return true;
  }

  // Only press able to mint new item
  function mint(address to, uint256 tokenId) external onlyAllowSameDomain('Distributor') returns (bool) {
    _mint(to, tokenId);
    return _exists(tokenId);
  }
}
