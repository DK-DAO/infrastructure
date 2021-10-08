// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/proxy/Clones.sol';
import '../interfaces/INFT.sol';
import '../libraries/RegistryUser.sol';
import '../libraries/Bytes.sol';

/**
 * NFT Press
 * Name: Press
 * Domain: DKDAO
 */
contract Press is RegistryUser {
  // Allow to clone NFT
  using Clones for address;

  // Create new NFT
  event CreateNewNFT(bytes32 indexed domain, address indexed nftContract, bytes32 indexed name);

  // Pass constructor parameter to User
  constructor(address registry_, bytes32 domain_) {
    _registryUserInit(registry_, domain_);
  }

  /*******************************************************
   * Operator section
   ********************************************************/

  // Clone new NFT
  function createNewNFT(
    string memory name_,
    string memory symbol_,
    string memory uri_
  ) external onlyAllowSameDomain('Operator') returns (address) {
    address newNft = _registry.getAddress(_domain, 'NFT').clone();
    INFT(newNft).init(address(_registry), _domain, name_, symbol_, uri_);
    return newNft;
  }
}
