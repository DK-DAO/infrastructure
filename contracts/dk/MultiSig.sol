// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';

/**
 * Multi Signature Wallet
 * Name: MultiSig
 * Domain: Duelist King
 */
contract MultiSig {
  // Address lib providing safe {call} and {delegatecall}
  using Address for address;

  // Structure of proposal
  struct Proposal {
    int256 vote;
    uint64 expired;
    bool executed;
    bool delegate;
    uint256 value;
    address target;
    bytes data;
  }

  // Total number of owner
  uint256 private _ownerCount;

  // Proposal storage
  mapping(address => bool) private _owners;

  // Proposal index, begin from 1
  uint256 private _proposalIndex;

  // Proposal storage
  mapping(uint256 => Proposal) private _proposalStorage;

  // Voted storage
  mapping(uint256 => mapping(address => bool)) private _votedStorage;

  // Only allow owner to call this smart contract
  modifier onlyOwner() {
    require(_owners[msg.sender], 'MultiSig: Sender was not owner');
    _;
  }

  // Create a new proposal
  event CreateProposal(uint256 indexed proposalId, uint256 indexed expired);
  // Execute proposal
  event ExecuteProposal(uint256 indexed proposalId, address indexed trigger, int256 indexed vote);
  // Positive vote
  event PositiveVote(uint256 indexed proposalId, address indexed owner);
  // Negative vote
  event NegativeVote(uint256 indexed proposalId, address indexed owner);
  // Transfer ownership
  event TransferOwnership(address indexed from, address indexed to);

  receive() external payable {}

  constructor(address[] memory owners_) {
    for (uint256 i = 0; i < owners_.length; i += 1) {
      _owners[owners_[i]] = true;
      emit TransferOwnership(address(0), owners_[i]);
    }
    _ownerCount = owners_.length;
  }

  // Create a new proposal
  function transferOwnership(address newOwner) external onlyOwner returns (bool) {
    _owners[msg.sender] = false;
    _owners[newOwner] = true;
    emit TransferOwnership(msg.sender, newOwner);
    return true;
  }

  // Create a new proposal
  function createProposal(Proposal memory newProposal) external onlyOwner returns (uint256) {
    _proposalIndex += 1;
    newProposal.expired = uint64(block.timestamp + 1 days);
    newProposal.vote = 0;
    _proposalStorage[_proposalIndex] = newProposal;
    emit CreateProposal(_proposalIndex, newProposal.expired);
    return _proposalIndex;
  }

  // Vote a proposal
  function voteProposal(uint256 proposalId, bool positive) external onlyOwner returns (bool) {
    require(block.timestamp < _proposalStorage[proposalId].expired, 'MultiSig: Voting period was over');
    require(_votedStorage[proposalId][msg.sender] == false, 'MultiSig: You had voted this proposal');
    if (positive) {
      _proposalStorage[proposalId].vote += 1;
      emit PositiveVote(proposalId, msg.sender);
    } else {
      _proposalStorage[proposalId].vote -= 1;
      emit NegativeVote(proposalId, msg.sender);
    }
    _votedStorage[proposalId][msg.sender] = true;
    return true;
  }

  // Execute a voted proposal
  function execute(uint256 proposalId) external onlyOwner returns (bool) {
    Proposal memory currentProposal = _proposalStorage[proposalId];
    require(block.timestamp > _proposalStorage[proposalId].expired, "MultiSig: Voting period wasn't over");
    require(currentProposal.vote >= int256(_ownerCount / 2), 'MultiSig: Vote was not pass threshold');
    require(currentProposal.executed == false, 'MultiSig: Proposal was executed');
    if (currentProposal.delegate) {
      currentProposal.target.functionDelegateCall(currentProposal.data);
    } else {
      if (currentProposal.target.isContract()) {
        currentProposal.target.functionCallWithValue(currentProposal.data, currentProposal.value);
      } else {
        payable(address(currentProposal.target)).transfer(currentProposal.value);
      }
    }
    currentProposal.executed = true;
    _proposalStorage[proposalId] = currentProposal;
    emit ExecuteProposal(proposalId, msg.sender, currentProposal.vote);
    return true;
  }

  function proposalIndex() external view returns (uint256) {
    return _proposalIndex;
  }

  function proposalDetail(uint256 index) external view returns (Proposal memory) {
    return _proposalStorage[index];
  }

  function isOwner(address owner) external view returns (bool) {
    return _owners[owner];
  }

  function isVoted(uint256 proposalId, address owner) external view returns (bool) {
    return _votedStorage[proposalId][owner];
  }
}
