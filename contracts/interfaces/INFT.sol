// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

interface INFT {
  function mint(address to, uint256 tokenId) external returns (bool);
}
