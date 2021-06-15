// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/proxy/Clones.sol';
import '../libraries/User.sol';
import '../libraries/Bytes.sol';
import '../interfaces/INFT.sol';

/**
 * Item manufacture
 * Name: Press
 * Domain: DKDAO Infrastructure
 */
contract Press is User {
  // Using clones for address
  using Clones for address;

  event NewNFT(bytes32 indexed nftDomain, string indexed name, address indexed nftAddress);

  // We only allow call from registed distributor on Registry
  modifier onlyAllowExistedDistributor(bytes32 _domain) {
    require(registry.isExistRecord(_domain, 'Distributor'), 'Press: Distributor was not existed');
    _;
  }

  // Pass constructor parameter to User
  constructor(address _registry, bytes32 _domain) {
    init(_registry, _domain);
  }

  // Allow another distributor of other domain to trigger item creation
  function newNFT(
    bytes32 _domain,
    string calldata _name,
    string calldata _symbol
  ) external onlyAllowExistedDistributor(_domain) returns (address) {
    address nft = registry.getAddress('DKDAO Infrastructure', 'NFT');
    address cloned = nft.clone();
    INFT(cloned).nftInit(_name, _symbol, address(registry), _domain);
    emit NewNFT(_domain, _name, cloned);
    return cloned;
  }
}
