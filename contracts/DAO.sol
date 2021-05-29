// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './User.sol';

contract DAO {

  modifier onlyTokenOwner() {
    _;
  }

  modifier onlyActiveProposal(uint256 proposalId) {
    _;
  }

  address private DKDToken;

  struct Proposal {
    bytes32 proposalDigest;
    address voting;
    uint64 expired;
    bool success;
    bool delegate;
    address target;
    bytes executeData;
  }

  uint256 proposalIndex;

  mapping(uint256 => Proposal) proposalStorage;

  function createProposal(Proposal memory newProposal) external onlyTokenOwner returns (uint256) {
    address payable addr;
    // We going to create a minimal propxy
    // Use minimal proxy as a way to take snapshot ledger
    assembly {
      // let proxyCode = new bytes(32)
      let proxyCode := mload(0x40)
      // Copy first 32 bytes of minimal proxy into memory
      mstore(proxyCode, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
      // Overwrite target address
      mstore(add(proxyCode, 0x14), DKDToken.slot)
      // Copy last 32 bytes to minimal proxy into memory
      mstore(add(proxyCode, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
      // Create smart contract with code from memory with length 55 and salt (contain target addresss)
      addr := create(0, proxyCode, 0x37)
      // Do smart contract deployed correctly?
      if iszero(extcodesize(addr)) {
        revert(0, 0)
      }
    }
    proposalIndex += 1;
    newProposal.voting = addr;
    proposalStorage[proposalIndex] = newProposal;
    return proposalIndex;
  }

  function voteProposal(uint256 proposalId) external returns (bool) {
    Proposal memory currentProposal = proposalStorage[proposalId];
    IERC20 votingTokenAddress = IERC20(currentProposal.voting);
    // Burn voting token to perform vote
    votingTokenAddress.transfer(address(0), votingTokenAddress.balanceOf(msg.sender));
    return true;
  }

  function execute(uint256 proposalId) external returns (bool) {
    Proposal memory currentProposal = proposalStorage[proposalId];
    IERC20 votingTokenAddress = IERC20(currentProposal.voting);
    require(
      votingTokenAddress.balanceOf(address(0)) > votingTokenAddress.totalSupply() / 2,
      'DAO: Voting was not passed'
    );
    return true;
  }
}
