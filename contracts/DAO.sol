// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import './interfaces/IDAO.sol';
import './interfaces/IDAOToken.sol';
import './libraries/User.sol';

/**
 * DAO
 * Name: DAO
 * Domain: DKDAO, *
 */
contract DAO is User, IDAO {
  // Address lib providing safe {call} and {delegatecall}
  using Address for address;

  // Proposal index, begin from 1
  uint256 proposalIndex;

  // Proposal storage
  mapping(uint256 => Proposal) proposalStorage;

  // Voted storage
  mapping(uint256 => mapping(address => bool)) votedStorage;

  // Create a new proposal
  event CreateProposal(uint256 indexed proposalId, bytes32 indexed proposalDigest, uint256 indexed expired);
  // Execute proposal
  event ExecuteProposal(uint256 indexed proposalId, address indexed trigger, int256 indexed vote);
  // Positive vote
  event PositiveVote(uint256 indexed proposalId, address indexed stakeholder, uint256 indexed power);
  // Negative vote
  event NegativeVote(uint256 indexed proposalId, address indexed stakeholder, uint256 indexed power);

  function init(address _registry, bytes32 _domain) external override returns(bool) {
    return _init(_registry, _domain);
  }

  // Create a new proposal
  function createProposal(Proposal memory newProposal) external override returns (uint256) {
    uint256 votePower = IDAOToken(getAddressSameDomain('DAOToken')).votePower(msg.sender);
    require(votePower > 0, 'DAO: Only allow locked token to vote');
    proposalIndex += 1;
    newProposal.expired = uint64(block.timestamp + 7 days);
    proposalStorage[proposalIndex] = newProposal;
    return proposalIndex;
  }

  // Vote a proposal
  function voteProposal(uint256 proposalId, bool positive) external override returns (bool) {
    uint256 votePower = IDAOToken(getAddressSameDomain('DAOToken')).votePower(msg.sender);
    require(block.timestamp < proposalStorage[proposalId].expired, 'DAO: Voting period was over');
    require(votePower > 0, 'DAO: Only allow stakeholder to vote');
    require(votedStorage[proposalId][msg.sender] == false, 'DAO: You have voted this proposal');
    if (positive) {
      proposalStorage[proposalId].vote += int256(votePower);
      emit PositiveVote(proposalId, msg.sender, votePower);
    } else {
      proposalStorage[proposalId].vote -= int256(votePower);
      emit NegativeVote(proposalId, msg.sender, votePower);
    }
    votedStorage[proposalId][msg.sender] = false;
    return true;
  }

  // Execute a voted proposal
  function execute(uint256 proposalId) external override returns (bool) {
    Proposal memory currentProposal = proposalStorage[proposalId];
    int256 threshold = int256(IDAOToken(getAddressSameDomain('DAOToken')).totalSupply() / 2);
    require(block.timestamp > proposalStorage[proposalId].expired, "DAO: Voting period wasn't over");
    require(currentProposal.vote > threshold, 'DAO: Vote was not pass threshold');
    require(currentProposal.executed == false, 'DAO: Proposal was executed');
    if (currentProposal.delegate) {
      currentProposal.target.functionDelegateCall(currentProposal.data);
    } else {
      currentProposal.target.functionCall(currentProposal.data);
    }
    currentProposal.executed = true;
    proposalStorage[proposalId] = currentProposal;
    emit ExecuteProposal(proposalId, msg.sender, currentProposal.vote);
    return true;
  }
}
