// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

interface IDAO {
  struct Proposal {
    bytes32 proposalDigest;
    address voting;
    uint64 expired;
    bool success;
    bool delegate;
    address target;
    bytes executeData;
  }

  function createProposal(Proposal memory newProposal) external returns (uint256);

  function voteProposal(uint256 proposalId) external returns (bool);

  function execute(uint256 proposalId) external returns (bool);
}
