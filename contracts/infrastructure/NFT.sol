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
contract NFT is User, ERC721('DKDAO Items', 'DKDAOI'), Ownable {
  string private _uri;
  uint256 private _supply;

  // Pass constructor parameter to User
  constructor(address _registry, bytes32 _domain) {
    _uri = 'https://metadata.dkdao.network/token/';
    _init(_registry, _domain);
  }

  // Only press able to mint new item
  function mint(address to, uint256 tokenId) external onlyAllowSameDomain('Press') returns (bool) {
    _supply += 1;
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

  // Migrate from the old contract to this contract
  function migrate(uint256 tokenId) external onlyOwner returns (bool) {
    address owner = ERC721(0x6ef3C1aA349D621d495BE98C7678Ee49107b7Ec2).ownerOf(tokenId);
    _mint(owner, tokenId);
    return true;
  }

  // Change the base URI
  function changeBaseURI(string memory uri_) public onlyOwner returns (bool) {
    _uri = uri_;
    return true;
  }

  // Get the base URI
  function _baseURI() internal view override returns (string memory) {
    return _uri;
  }

  // Get total supply
  function totalSupply() external view returns (uint256) {
    return _supply;
  }
}
