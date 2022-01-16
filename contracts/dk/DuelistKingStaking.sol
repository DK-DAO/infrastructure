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
  uint32 constant decimals = 1000000;

  mapping(uint256 => StakingCampaign) private _campaignStorage;

  mapping(uint256 => mapping(address => UserStakingSlot)) private _userStakingSlot;

  mapping(address => uint256) private _totalPenalty;

  // New created campaign event
  event NewCampaign(uint64 indexed startDate, address indexed tokenAddress, uint256 indexed capaignId);

  // Staking event
  event Staking(address indexed owner, uint256 indexed amount, uint256 indexed startStakingDate);

  // Unstaking event
  event Unstaking(address indexed owner, uint256 indexed amount, uint256 indexed unStakeTime);

  // User claim boxes event
  event ClaimRewardBoxes(address indexed owner, uint256 indexed rewardPhaseBoxId, uint256 indexed numberOfBoxes);

  constructor(address registry_, bytes32 domain_) {
    _registryUserInit(registry_, domain_);
  }

  /*******************************************************
   * Public section
   *******************************************************/

  function staking(uint256 campaignId, uint256 amountOfToken) external returns (bool) {
    StakingCampaign memory currentCampaign = _campaignStorage[campaignId];
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[campaignId][msg.sender];
    ERC20 currentToken = ERC20(currentCampaign.tokenAddress);

    require(block.timestamp >= currentCampaign.startDate, 'DKStaking: This staking event has not yet starting');
    require(
      block.timestamp <= currentCampaign.endDate - currentCampaign.numberOfLockDays,
      'DKStaking: Not enough staking duration'
    );
    require(
      currentUserStakingSlot.stakingAmountOfToken + amountOfToken <= currentCampaign.limitStakingAmountForUser,
      'DKStaking: Token limit per user exceeded'
    );

    if (currentUserStakingSlot.stakingAmountOfToken == 0) {
      currentUserStakingSlot.startStakingDate = uint64(block.timestamp);
      currentUserStakingSlot.lastStakingDate = uint64(block.timestamp);
    }

    require(currentToken.balanceOf(msg.sender) >= amountOfToken, 'DKStaking: Insufficient balance');

    uint256 beforeBalance = currentToken.balanceOf(address(this));
    currentToken.safeTransferFrom(msg.sender, address(this), amountOfToken);
    uint256 afterBalance = currentToken.balanceOf(address(this));
    require(afterBalance - beforeBalance == amountOfToken, 'DKStaking: Invalid token transfer');

    currentCampaign.stakedAmountOfToken += amountOfToken;
    require(currentCampaign.stakedAmountOfToken <= currentCampaign.maxAmountOfToken, 'DKStaking: Token limit exceeded');
    _campaignStorage[campaignId] = currentCampaign;

    currentUserStakingSlot.stakedAmountOfBoxes = estimateUserReward(campaignId);
    currentUserStakingSlot.lastStakingDate = uint64(block.timestamp);
    currentUserStakingSlot.stakingAmountOfToken += amountOfToken;

    _userStakingSlot[campaignId][msg.sender] = currentUserStakingSlot;
    emit Staking(msg.sender, amountOfToken, block.timestamp);
    return true;
  }

  function claimBoxes(uint256 campaignId) external returns (bool) {
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[campaignId][msg.sender];
    StakingCampaign memory _currentCampaign = _campaignStorage[campaignId];
    currentUserStakingSlot.stakedAmountOfBoxes = estimateUserReward(campaignId);
    require(currentUserStakingSlot.stakedAmountOfBoxes > 0, 'DKStaking: Insufficient boxes');

    // Validate claim duration
    require(
      block.timestamp >= currentUserStakingSlot.startStakingDate + (_currentCampaign.numberOfLockDays * (1 days)) ||
        block.timestamp >= _currentCampaign.endDate,
      'DKStaking: Unable to claim boxes before locked time'
    );

    emit ClaimRewardBoxes(
      msg.sender,
      _currentCampaign.rewardPhaseBoxId,
      currentUserStakingSlot.stakedAmountOfBoxes / decimals
    );

    // Update user data
    currentUserStakingSlot.stakedAmountOfBoxes = 0;
    currentUserStakingSlot.lastStakingDate = uint64(block.timestamp);
    _userStakingSlot[campaignId][msg.sender] = currentUserStakingSlot;
    return true;
  }

  function unStaking(uint256 campaignId) external returns (bool) {
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[campaignId][msg.sender];
    StakingCampaign memory currentCampaign = _campaignStorage[campaignId];
    ERC20 currentToken = ERC20(currentCampaign.tokenAddress);

    require(currentUserStakingSlot.stakingAmountOfToken > 0, 'DKStaking: No token to be unstaked');

    // User unstake before lockTime and in duration event
    // will be paid for penalty fee and no reward box
    uint64 currentTimestamp = getUserStakingTimestamp(currentCampaign);
    uint64 stakingDuration = (currentTimestamp - currentUserStakingSlot.startStakingDate) / (1 days);

    if (stakingDuration < currentCampaign.numberOfLockDays && block.timestamp <= currentCampaign.endDate) {
      uint256 penaltyAmount = (currentUserStakingSlot.stakingAmountOfToken * 2) / 100;
      _totalPenalty[currentCampaign.tokenAddress] += penaltyAmount;
      currentToken.safeTransfer(msg.sender, currentUserStakingSlot.stakingAmountOfToken - penaltyAmount);

      // remove user staking amount from the pool
      currentCampaign.stakedAmountOfToken -= currentUserStakingSlot.stakingAmountOfToken;
      currentUserStakingSlot.stakedAmountOfBoxes = 0;
      currentUserStakingSlot.stakingAmountOfToken = 0;

      // Update campaign and user staking slot
      _campaignStorage[campaignId] = currentCampaign;
      _userStakingSlot[campaignId][msg.sender] = currentUserStakingSlot;
      emit Unstaking(msg.sender, currentUserStakingSlot.stakingAmountOfToken, block.timestamp);
      return true;
    }

    currentUserStakingSlot.stakedAmountOfBoxes = estimateUserReward(campaignId);
    currentToken.safeTransfer(msg.sender, currentUserStakingSlot.stakingAmountOfToken);
    emit ClaimRewardBoxes(
      msg.sender,
      currentCampaign.rewardPhaseBoxId,
      currentUserStakingSlot.stakedAmountOfBoxes / decimals
    );

    // remove user staking amount from the pool
    currentCampaign.stakedAmountOfToken -= currentUserStakingSlot.stakingAmountOfToken;
    currentUserStakingSlot.stakingAmountOfToken = 0;
    currentUserStakingSlot.stakedAmountOfBoxes = 0;

    // Update campaign and user staking slot
    _campaignStorage[campaignId] = currentCampaign;
    _userStakingSlot[campaignId][msg.sender] = currentUserStakingSlot;
    emit Unstaking(msg.sender, currentUserStakingSlot.stakingAmountOfToken, block.timestamp);
    return true;
  }

  /*******************************************************
   * Same domain section
   *******************************************************/

  // Create a new staking campaign
  function createNewStakingCampaign(StakingCampaign memory newCampaign)
    external
    onlyAllowSameDomain('StakingOperator')
  {
    require(
      newCampaign.startDate > block.timestamp && newCampaign.endDate > newCampaign.startDate,
      'DKStaking: Invalid timeline format'
    );
    uint64 duration = (newCampaign.endDate - newCampaign.startDate) / (1 days);
    require(
      newCampaign.numberOfLockDays > 0 && newCampaign.numberOfLockDays <= 90,
      'DKStaking: numberOfLockDays must be greater than 0 and less than 90 days'
    );
    require(newCampaign.numberOfLockDays <= duration, 'DKStaking: Lock days should be less than duration days');

    require(newCampaign.rewardPhaseBoxId >= 1, 'DKStaking: Invalid phase id');
    require(newCampaign.tokenAddress.isContract(), 'DKStaking: Token address is not a smart contract');

    newCampaign.returnRate = uint64(
      (newCampaign.maxNumberOfBoxes * decimals) / (newCampaign.maxAmountOfToken * duration)
    );
    _campaignStorage[totalCampaign] = newCampaign;

    emit NewCampaign(newCampaign.startDate, newCampaign.tokenAddress, totalCampaign);
    totalCampaign += 1;
  }

  function withdrawPenaltyToken(uint256 campaignId, address beneficiary)
    external
    onlyAllowSameDomain('StakingOperator')
    returns (bool)
  {
    StakingCampaign memory currentCampaign = _campaignStorage[campaignId];
    ERC20 currentToken = ERC20(currentCampaign.tokenAddress);
    uint256 withdrawingAmount = _totalPenalty[currentCampaign.tokenAddress];
    require(withdrawingAmount > 0, 'DKStaking: Invalid withdrawing amount');
    currentToken.safeTransfer(beneficiary, withdrawingAmount);
    return true;
  }

  /*******************************************************
   * Private section
   *******************************************************/

  function getUserStakingTimestamp(StakingCampaign memory currentCampaign) private view returns (uint64) {
    uint64 eventTimestamp = uint64(block.timestamp);
    if (eventTimestamp > currentCampaign.endDate) {
      eventTimestamp = currentCampaign.endDate;
    }
    return eventTimestamp;
  }

  function estimateUserReward(uint256 campaignId) private view returns (uint128) {
    StakingCampaign memory currentCampaign = _campaignStorage[campaignId];
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[campaignId][msg.sender];

    uint64 currentTimestamp = getUserStakingTimestamp(currentCampaign);

    uint128 remainingReward = uint128(
      ((currentUserStakingSlot.stakingAmountOfToken * (currentTimestamp - currentUserStakingSlot.lastStakingDate)) /
        (1 days)) * currentCampaign.returnRate
    );
    return currentUserStakingSlot.stakedAmountOfBoxes + remainingReward;
  }

  /*******************************************************
   * View section
   *******************************************************/

  function viewUserReward(uint256 campaignId) external view returns (uint256) {
    return estimateUserReward(campaignId) / decimals;
  }

  function getCurrentUserStakingAmount(uint256 campaignId) external view returns (uint256) {
    return _userStakingSlot[campaignId][msg.sender].stakingAmountOfToken;
  }

  function getCurrentUserStartStakingDate(uint256 campaignId) external view returns (uint256) {
    return _userStakingSlot[campaignId][msg.sender].startStakingDate;
  }

  function getBlockTime() external view returns (uint256) {
    return block.timestamp;
  }

  function getTotalPenaltyAmount(address tokenAddress) external view returns (uint256) {
    require(tokenAddress.isContract(), 'DKStaking: Token address is not a smart contract');
    return _totalPenalty[tokenAddress];
  }
}
