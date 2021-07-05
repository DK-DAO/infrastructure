// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/utils/Strings.sol';
import '../libraries/ERC721.sol';
import '../libraries/User.sol';

/**
 * Only allow Press to mint new token following domain
 * Distributor will work with NFT through Press'
 * Name: NFT
 * Domain: DKDAO Infrastructure
 */
contract NFT is ERC721, User {
  // Use string for uint256
  using Strings for uint256;

  /**
   * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
   */
  function init(
    string memory name_,
    string memory symbol_,
    address registry,
    bytes32 domain
  ) external returns (bool) {
    require(_init(registry, domain), 'ERC721: This method only able to be called once');
    _name = name_;
    _symbol = symbol_;
    return true;
  }

  // Base URL that provided token metadata
  function _baseURI() internal pure override returns (string memory) {
    return 'https://nft.duelistking.com/?card=';
  }

  // Contruct token URI for a given tokenId
  function tokenURI(uint256 tokenId) public view override returns (string memory) {
    return string(abi.encodePacked(_baseURI(), _symbol, '&id=', tokenId.toString()));
  }

  // Only press able to mint new item
  function mint(address to, uint256 tokenId) external onlyAllowSameDomain('Distributor') returns (bool) {
    _mint(to, tokenId);
    return _exists(tokenId);
  }
}
