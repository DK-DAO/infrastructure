// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

interface INFT {
  function nftInit(
    string memory name_,
    string memory symbol_,
    address registry,
    bytes32 domain
  ) external returns (bool);

  function mint(address to, uint256 tokenId) external returns (bool);
}
