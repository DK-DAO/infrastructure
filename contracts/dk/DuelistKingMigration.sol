// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';

contract DuelistKingMigration is Ownable {
  IERC721 immutable nftToken;

  constructor(address nftTokenAddress) {
    nftToken = IERC721(nftTokenAddress);
  }

  function migrate(uint256[] calldata tokenIds) external {
    for (uint256 i; i < tokenIds.length; i += 1) {
      nftToken.transferFrom(msg.sender, address(this), tokenIds[i]);
    }
  }

  function approveAll(address operator) external onlyOwner {
    nftToken.setApprovalForAll(operator, true);
  }
}
