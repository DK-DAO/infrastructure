// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '../libraries/ERC721.sol';
import '../libraries/RegistryUser.sol';

/**
 * Only allow Press to mint new token following domain
 * Distributor will work with NFT through Press'
 * Name: NFT
 * Domain: Infrastructure
 */
contract NFT is RegistryUser, ERC721 {
  uint256 private _supply;

  // This method will replace constructor
  function init(
    address registry_,
    bytes32 domain_,
    string memory name_,
    string memory symbol_,
    string memory uri_
  ) external returns (bool) {
    _erc721Init(name_, symbol_, uri_);
    _registryUserInit(registry_, domain_);
    return true;
  }

  /*******************************************************
   * Distributor section
   ********************************************************/

  // Only distributor able to mint new item
  function mint(address to, uint256 tokenId) external onlyAllowSameDomain('Distributor') returns (bool) {
    _supply += 1;
    _mint(to, tokenId);
    return _exists(tokenId);
  }

  // Only distributor able to mint new item
  function burn(uint256 tokenId) external onlyAllowSameDomain('Distributor') returns (bool) {
    require(_supply > 0, 'NFT: Underflow detected');
    _supply -= 1;
    _burn(tokenId);
    return !_exists(tokenId);
  }

  // Change the base URI
  function changeBaseURI(string memory uri_) public onlyAllowSameDomain('Distributor') returns (bool) {
    _uri = uri_;
    return true;
  }

  /*******************************************************
   * Swap cross domain section
   ********************************************************/

  // Allow swap to perform transfer
  function safeTransfer(
    address from,
    address to,
    uint256 tokenId
  ) external onlyAllowCrossDomain('Infrastructure', 'Swap') returns (bool) {
    _transfer(from, to, tokenId);
    return true;
  }

  /*******************************************************
   * View section
   ********************************************************/

  // Get total supply
  function totalSupply() external view returns (uint256) {
    return _supply;
  }
}
