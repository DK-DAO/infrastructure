// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '../libraries/RegistryUser.sol';

/**
 * Duelist King Staking
 * Name: DuelistKingStaking
 * Doamin: Duelist King
 */

contract DuelistKingStaking is RegistryUser {
  using SafeERC20 for ERC20;
  using Address for address;

  struct StakingCampaign {
    uint64 startDate;
    uint64 endDate;
    uint64 returnRate;
    uint64 rewardPhaseBoxId;
    uint256 maxAmountOfToken;
    uint256 stakedAmountOfToken;
    uint256 limitStakingAmountForUser;
    address tokenAddress;
    uint64 maxNumberOfBoxes;
    uint64 numberOfLockDays;
  }

  struct UserStakingSlot {
    uint256 stakingAmountOfToken;
    uint128 stakedAmountOfBoxes;
    uint64 startStakingDate;
    uint64 lastStakingDate;
  }

  address private _owner;
  uint256 private totalCampaign;
  uint32 constant decimal = 1000000;

  mapping(uint256 => StakingCampaign) private _campaignStorage;

  mapping(uint256 => mapping(address => UserStakingSlot)) private _userStakingSlot;

  // New created campaign event
  event NewCampaign(uint64 indexed startDate, address indexed tokenAddress, uint256 indexed capaignId);

  // Staking event
  event Staking(address indexed owner, uint256 indexed amount, uint256 indexed startStakingDate);

  // Unstaking event
  event Unstaking(address indexed owner, uint256 indexed amount, uint256 indexed unStakeTime);

  // Issue box to user evnt
  event ClaimRewardBox(address indexed owner, uint256 indexed rewardPhaseBoxId, uint256 indexed numberOfBoxes);

  constructor(address registry_, bytes32 domain_) {
    _registryUserInit(registry_, domain_);
  }

  /*******************************************************
   * Public section
   *******************************************************/

  function staking(uint256 _campaignId, uint256 _amountOfToken) external returns (bool) {
    StakingCampaign memory _currentCampaign = _campaignStorage[_campaignId];
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[_campaignId][msg.sender];
    ERC20 currentToken = ERC20(_currentCampaign.tokenAddress);

    require(block.timestamp >= _currentCampaign.startDate, 'DKStaking: This staking event has not yet starting');
    require(
      block.timestamp <= _currentCampaign.endDate - _currentCampaign.numberOfLockDays,
      'DKStaking: Not enough staking duration'
    );
    require(
      currentUserStakingSlot.stakingAmountOfToken + _amountOfToken <= _currentCampaign.limitStakingAmountForUser,
      'DKStaking: Token limit per user exceeded'
    );

    if (currentUserStakingSlot.stakingAmountOfToken == 0) {
      currentUserStakingSlot.startStakingDate = uint64(block.timestamp);
      currentUserStakingSlot.lastStakingDate = uint64(block.timestamp);
    }

    require(currentToken.balanceOf(msg.sender) >= _amountOfToken, 'DKStaking: Insufficient balance');

    uint256 beforeBalance = currentToken.balanceOf(address(this));
    currentToken.safeTransferFrom(msg.sender, address(this), _amountOfToken);
    uint256 afterBalance = currentToken.balanceOf(address(this));
    require(afterBalance - beforeBalance == _amountOfToken, 'DKStaking: Invalid token transfer');

    _currentCampaign.stakedAmountOfToken += _amountOfToken;
    require(
      _currentCampaign.stakedAmountOfToken <= _currentCampaign.maxAmountOfToken,
      'DKStaking: Token limit exceeded'
    );
    _campaignStorage[_campaignId] = _currentCampaign;

    currentUserStakingSlot.stakedAmountOfBoxes += calculatePendingBoxes(currentUserStakingSlot, _currentCampaign);
    currentUserStakingSlot.lastStakingDate = uint64(block.timestamp);
    currentUserStakingSlot.stakingAmountOfToken += _amountOfToken;

    _userStakingSlot[_campaignId][msg.sender] = currentUserStakingSlot;
    emit Staking(msg.sender, _amountOfToken, block.timestamp);
    return true;
  }

  function claimBoxes(uint256 _campaignId) external returns (bool) {
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[_campaignId][msg.sender];
    StakingCampaign memory _currentCampaign = _campaignStorage[_campaignId];
    // Validate number of boxes to be claimed
    uint256 currentReward = viewUserReward(_campaignId);
    require(currentReward > 0, 'DKStaking: Insufficient boxes');

    // Validate claim duration
    require(
      block.timestamp >= currentUserStakingSlot.startStakingDate + (_currentCampaign.numberOfLockDays * (1 days)) ||
        block.timestamp >= _currentCampaign.endDate,
      'DKStaking: Unable to claim boxes before locked time'
    );

    emit ClaimRewardBox(msg.sender, _currentCampaign.rewardPhaseBoxId, currentReward);

    // Update user data
    currentUserStakingSlot.stakedAmountOfBoxes = 0;
    currentUserStakingSlot.lastStakingDate = uint64(block.timestamp);
    _userStakingSlot[_campaignId][msg.sender] = currentUserStakingSlot;
    return true;
  }

  function unStaking(uint256 _campaignId) external returns (bool) {
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[_campaignId][msg.sender];
    StakingCampaign memory _currentCampaign = _campaignStorage[_campaignId];
    ERC20 currentToken = ERC20(_currentCampaign.tokenAddress);

    require(currentUserStakingSlot.stakingAmountOfToken > 0, 'DKStaking: No token to be unstaked');

    // User unstake before lockTime and in duration event
    // will be paid for penalty fee and no reward box
    uint64 currentTimestamp = uint64(block.timestamp) > _currentCampaign.endDate
      ? _currentCampaign.endDate
      : uint64(block.timestamp);
    uint64 stakingDuration = (currentTimestamp - currentUserStakingSlot.startStakingDate) / (1 days);

    if (stakingDuration < _currentCampaign.numberOfLockDays && block.timestamp <= _currentCampaign.endDate) {
      uint256 penaltyAmount = (currentUserStakingSlot.stakingAmountOfToken * 2) / 100;
      currentToken.safeTransfer(msg.sender, currentUserStakingSlot.stakingAmountOfToken - penaltyAmount);

      // remove user staking amount from the pool
      _currentCampaign.stakedAmountOfToken -= currentUserStakingSlot.stakingAmountOfToken;
      currentUserStakingSlot.stakedAmountOfBoxes = 0;
      currentUserStakingSlot.stakingAmountOfToken = 0;
      _userStakingSlot[_campaignId][msg.sender] = currentUserStakingSlot;
      emit Unstaking(msg.sender, currentUserStakingSlot.stakingAmountOfToken, block.timestamp);
      return true;
    }

    currentUserStakingSlot.stakedAmountOfBoxes += calculatePendingBoxes(currentUserStakingSlot, _currentCampaign);
    currentToken.safeTransfer(msg.sender, currentUserStakingSlot.stakingAmountOfToken);
    emit ClaimRewardBox(
      msg.sender,
      _currentCampaign.rewardPhaseBoxId,
      currentUserStakingSlot.stakedAmountOfBoxes / decimal
    );

    // remove user staking amount from the pool
    _currentCampaign.stakedAmountOfToken -= currentUserStakingSlot.stakingAmountOfToken;
    currentUserStakingSlot.stakingAmountOfToken = 0;
    currentUserStakingSlot.stakedAmountOfBoxes = 0;
    _userStakingSlot[_campaignId][msg.sender] = currentUserStakingSlot;
    emit Unstaking(msg.sender, currentUserStakingSlot.stakingAmountOfToken, block.timestamp);
    return true;
  }

  /*******************************************************
   * Same domain section
   *******************************************************/

  // Create a new staking campaign
  function createNewStakingCampaign(StakingCampaign memory _newCampaign)
    external
    onlyAllowSameDomain('StakingOperator')
  {
    require(
      _newCampaign.startDate > block.timestamp && _newCampaign.endDate > _newCampaign.startDate,
      'DKStaking: Invalid timeline format'
    );
    uint64 duration = (_newCampaign.endDate - _newCampaign.startDate) / (1 days);
    require(
      _newCampaign.numberOfLockDays > 0 &&
        _newCampaign.numberOfLockDays <= 90 &&
        _newCampaign.numberOfLockDays <= duration,
      'DKStaking: Invalid duration or lock days format'
    );

    require(_newCampaign.rewardPhaseBoxId >= 1, 'Invalid phase id');
    require(_newCampaign.tokenAddress.isContract(), 'DKStaking: Token address is not a smart contract');

    _newCampaign.returnRate = uint64(
      (_newCampaign.maxNumberOfBoxes * decimal) / (_newCampaign.maxAmountOfToken * duration)
    );
    _campaignStorage[totalCampaign] = _newCampaign;

    emit NewCampaign(_newCampaign.startDate, _newCampaign.tokenAddress, totalCampaign);
    totalCampaign += 1;
  }

  function withdrawPenaltyPot(uint256 campaignId, address beneficiary)
    external
    onlyAllowSameDomain('StakingOperator')
    returns (bool)
  {
    StakingCampaign memory _currentCampaign = _campaignStorage[campaignId];
    ERC20 currentToken = ERC20(_currentCampaign.tokenAddress);
    uint256 withdrawingAmount = currentToken.balanceOf(address(this)) - _currentCampaign.stakedAmountOfToken;
    require(withdrawingAmount > 0, 'DKStaking: Invalid penalty pot');
    currentToken.safeTransfer(beneficiary, withdrawingAmount);
    return true;
  }

  function issueBoxes(
    address owner,
    uint256 rewardPhaseBoxId,
    uint256 numberOfBoxes
  ) private {
    emit ClaimRewardBox(owner, rewardPhaseBoxId, numberOfBoxes);
  }

  /*******************************************************
   * Private section
   *******************************************************/

  function getCurrentUserReward(uint256 _campaignId) private view returns (uint256) {
    StakingCampaign memory _currentCampaign = _campaignStorage[_campaignId];
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[_campaignId][msg.sender];
    return currentUserStakingSlot.stakedAmountOfBoxes + calculatePendingBoxes(currentUserStakingSlot, _currentCampaign);
  }

  function calculatePendingBoxes(UserStakingSlot memory userStakingSlot, StakingCampaign memory campaign)
    private
    view
    returns (uint64)
  {
    uint64 currentTimestamp = uint64(block.timestamp) > campaign.endDate ? campaign.endDate : uint64(block.timestamp);
    return
      uint64(
        ((userStakingSlot.stakingAmountOfToken * (currentTimestamp - userStakingSlot.lastStakingDate)) / (1 days)) *
          campaign.returnRate
      );
  }

  /*******************************************************
   * View section
   *******************************************************/

  function viewUserReward(uint256 _campaignId) public view returns (uint256) {
    return getCurrentUserReward(_campaignId) / decimal;
  }

  function getCurrentUserStakingAmount(uint256 _campaignId) public view returns (uint256) {
    return _userStakingSlot[_campaignId][msg.sender].stakingAmountOfToken;
  }

  function getBlockTime() public view returns (uint256) {
    return block.timestamp;
  }

  function getTotalPenaltyAmount(uint256 campaignId) public view returns (uint256) {
    StakingCampaign memory _currentCampaign = _campaignStorage[campaignId];
    ERC20 currentToken = ERC20(_currentCampaign.tokenAddress);
    return currentToken.balanceOf(address(this)) - _currentCampaign.stakedAmountOfToken;
  }
}
