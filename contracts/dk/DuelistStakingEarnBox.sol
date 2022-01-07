// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import "../dao/ERC20.sol";

contract StakingEarnBoxDKT {

/**
 * numberOfLockDays is a number of days that
 * user must be stack before unstacking without penalty
 */

  struct StakingCampaign {
    uint64 startDate;
    uint64 endDate;
    uint128 returnRate;
    uint256 maxAmountOfToken;
    uint256 stakedAmountOfToken;
    uint256 limitStakingAmountForUser;
    address tokenAddress;
    uint256 maxNumberOfBoxes;
    uint64 numberOfLockDays;
  }

  struct UserStakingSlot {
    uint256 stakingAmountOfToken;
    uint256 stakedAmountOfBoxes;
    uint64 startStakingDate;
    uint64 latestStakingDate;
  }

  address private _owner;
  uint256 private totalCampaign;

  mapping(uint256 => StakingCampaign) private _campaignStorage;

  mapping(uint256 => mapping(address => UserStakingSlot)) private _userStakingSlot;

  // New campaign created event
  event NewCampaign(uint64 indexed startDate, uint64 indexed endDate, uint64 numberOfLockDays, uint256 maxAmountOfToken, uint256 maxNumberOfBoxes, address indexed tokenAddress);

 // Staking event
  event Staking(address indexed owner, uint256 indexed amount, uint256 indexed startStakingDate);

  // Unstaking event
  event Unstaking(address indexed owner, uint256 indexed amount, uint256 indexed unStakeTime);

  constructor(address owner_){
    _owner = owner_;
  }

  // Right now, the security is onlyOwner
  // will be improve it later on base on business / technical 
  // requirements

  modifier onlyOwner() {
    require(msg.sender == _owner, 'Staking: Only owner can create a new campaign');
    _;
  }

  function createNewStakingCampaign(StakingCampaign memory _newCampaign) external onlyOwner{
    require(_newCampaign.startDate > block.timestamp, 'Staking: Start date should be a future date');
    require(_newCampaign.endDate > block.timestamp, 'Staking: End date should be a future date');
    uint256 duration = (_newCampaign.endDate - _newCampaign.startDate) / (1 days);
    require(duration >= 1 days, 'Staking: Duration must be at least 1 day');
    require(_newCampaign.numberOfLockDays <= duration, 'Staking: Number of lock days should be less than duration staking days');

    // Convert numberOfLockDays to timestamp
    _newCampaign.numberOfLockDays *= (1 days);
    _newCampaign.returnRate = uint128((_newCampaign.maxNumberOfBoxes * 1000000) / (_newCampaign.maxAmountOfToken * duration));
    _campaignStorage[totalCampaign] = _newCampaign;
    totalCampaign += 1;
    emit NewCampaign(_newCampaign.startDate,_newCampaign.endDate, _newCampaign.numberOfLockDays , _newCampaign.maxAmountOfToken,  _newCampaign.maxNumberOfBoxes, _newCampaign.tokenAddress);
  }

  function staking(uint256 _campaingId, uint256 _amountOfToken) external returns(bool) {
    StakingCampaign memory _currentCampaign = _campaignStorage[_campaingId];
    address tokenAddress = _currentCampaign.tokenAddress;
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[_campaingId][msg.sender];
    ERC20 currentToken = ERC20(tokenAddress);

    require(block.timestamp >= _currentCampaign.startDate, 'Staking: This staking event has not yet starting');
    require(block.timestamp < _currentCampaign.endDate, 'Staking: This stacking event has been expired');
    require(currentUserStakingSlot.stakingAmountOfToken + _amountOfToken <= _currentCampaign.limitStakingAmountForUser, 'Staking: Token limit per user exceeded');

    // Require a new user stack before endDate minus numberOfLockDays
    if (currentUserStakingSlot.stakingAmountOfToken == 0) {
      require(block.timestamp + _currentCampaign.numberOfLockDays <= _currentCampaign.endDate);
      currentUserStakingSlot.startStakingDate = uint64(block.timestamp);
      currentUserStakingSlot.latestStakingDate = uint64(block.timestamp);
    }

    uint256 beforeBalance = currentToken.balanceOf(address(this));
    require(currentToken.transferFrom(msg.sender, address(this), _amountOfToken));
    uint256 afterBalance = currentToken.balanceOf(address(this));
    require(afterBalance - beforeBalance == _amountOfToken);

    _currentCampaign.stakedAmountOfToken += _amountOfToken;
    require(_currentCampaign.stakedAmountOfToken <= _currentCampaign.maxAmountOfToken, 'Staking: Token limit exceeded');
    _campaignStorage[_campaingId] = _currentCampaign;

    currentUserStakingSlot.stakedAmountOfBoxes += currentUserStakingSlot.stakingAmountOfToken * (block.timestamp - currentUserStakingSlot.latestStakingDate) * _currentCampaign.returnRate;
    currentUserStakingSlot.latestStakingDate = uint64(block.timestamp);
    currentUserStakingSlot.stakingAmountOfToken += _amountOfToken;

    _userStakingSlot[_campaingId][msg.sender] = currentUserStakingSlot;
    emit Staking(msg.sender, _amountOfToken, block.timestamp);
    return true;
  }

  function unStaking(uint256 _campaingId, address senderAddress) external returns(bool) {
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[_campaingId][msg.sender];
    StakingCampaign memory _currentCampaign = _campaignStorage[_campaingId];
    address tokenAddress = _currentCampaign.tokenAddress;
    ERC20 currentToken = ERC20(tokenAddress);
    
    require(currentUserStakingSlot.stakingAmountOfToken > 0, 'Staking: No token to be unstacked');
    require(msg.sender == senderAddress, 'Staking: Require owner to unstack');

    // User unstack before lockTime 
    // will be paid for penalty fee
    if (block.timestamp - currentUserStakingSlot.startStakingDate < _currentCampaign.numberOfLockDays) {
      currentToken.transferFrom(address(this), msg.sender, currentUserStakingSlot.stakingAmountOfToken * 98 / 100);

      currentUserStakingSlot.stakedAmountOfBoxes = 0;
      currentUserStakingSlot.stakingAmountOfToken = 0;
      _userStakingSlot[_campaingId][msg.sender] = 
      currentUserStakingSlot;
      emit Unstaking(msg.sender, currentUserStakingSlot.stakingAmountOfToken, block.timestamp);
      return true;
    }

    // TODO: Issue boxes to user here
    // mintBoxes()
    currentToken.transferFrom(address(this), msg.sender, currentUserStakingSlot.stakingAmountOfToken);

    currentUserStakingSlot.stakedAmountOfBoxes = 0;
    currentUserStakingSlot.stakingAmountOfToken = 0;
    _userStakingSlot[_campaingId][msg.sender] = currentUserStakingSlot;
    emit Unstaking(msg.sender, currentUserStakingSlot.stakingAmountOfToken, block.timestamp);
    return true;
  }
}