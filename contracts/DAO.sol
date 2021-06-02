// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './interfaces/IDAO.sol';
import './libraries/User.sol';
import './libraries/Clone.sol';

contract DAO is User, IDAO {
  using Clone for address;

  modifier onlyTokenOwner() {
    _;
  }

  modifier onlyActiveProposal(uint256 proposalId) {
    _;
  }

  uint256 proposalIndex;

  mapping(uint256 => Proposal) proposalStorage;

  function createProposal(Proposal memory newProposal) external onlyTokenOwner override returns (uint256) {
    proposalIndex += 1;
    // Clone the DAO Token of the same domain for snapshot
    newProposal.voting = registry.getAddress(domain, 'DAOToken').clone();
    proposalStorage[proposalIndex] = newProposal;
    return proposalIndex;
  }

  function voteProposal(uint256 proposalId) external override returns (bool) {
    Proposal memory currentProposal = proposalStorage[proposalId];
    IERC20 votingTokenAddress = IERC20(currentProposal.voting);
    // Burn voting token to perform vote
    votingTokenAddress.transfer(address(0), votingTokenAddress.balanceOf(msg.sender));
    return true;
  }

  function execute(uint256 proposalId) external override returns (bool) {
    Proposal memory currentProposal = proposalStorage[proposalId];
    IERC20 votingTokenAddress = IERC20(currentProposal.voting);
    require(
      votingTokenAddress.balanceOf(address(0)) > votingTokenAddress.totalSupply() / 2,
      'DAO: Voting was not passed'
    );
    return true;
  }
}
