// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import 'hardhat/console.sol';

contract StakingEarnBoxDKT {
  using SafeERC20 for ERC20;
  using Address for address;

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
    uint64 lastStakingDate;
  }

  address private _owner;
  uint256 private totalCampaign;

  mapping(uint256 => StakingCampaign) private _campaignStorage;

  mapping(uint256 => mapping(address => UserStakingSlot)) private _userStakingSlot;

  // New created campaign event
  event NewCampaign(
    uint64 indexed startDate,
    uint64 indexed endDate,
    uint64 numberOfLockDays,
    uint256 maxAmountOfToken,
    uint256 maxNumberOfBoxes,
    address indexed tokenAddress
  );

  // Staking event
  event Staking(address indexed owner, uint256 indexed amount, uint256 indexed startStakingDate);

  // Unstaking event
  event Unstaking(address indexed owner, uint256 indexed amount, uint256 indexed unStakeTime);

  constructor(address owner_) {
    _owner = owner_;
  }

  // Right now, the security is onlyOwner
  // will be improve it later on base on business / technical
  // requirements

  modifier onlyOwner() {
    require(msg.sender == _owner, 'Staking: Only owner can create a new campaign');
    _;
  }

  function getOwnerAddress() public view returns (address) {
    return _owner;
  }

  function createNewStakingCampaign(StakingCampaign memory _newCampaign) external onlyOwner {
    require(
      _newCampaign.startDate > block.timestamp &&
        _newCampaign.endDate > _newCampaign.startDate &&
        // maximum campaign duration is 90 days
        _newCampaign.endDate < _newCampaign.startDate + 90 days,
      'Invalid startDate or endDate'
    );
    uint64 duration = (_newCampaign.endDate - _newCampaign.startDate) / (1 days);
    require(duration >= 1, 'Staking: Duration must be at least 1 day');
    require(
      _newCampaign.numberOfLockDays <= duration,
      'Staking: Number of lock days should be less than duration event days'
    );
    require(_newCampaign.tokenAddress.isContract(), 'Staking: Token address is not a smart contract');

    _newCampaign.returnRate = uint128(
      (_newCampaign.maxNumberOfBoxes * 1000000) / (_newCampaign.maxAmountOfToken * duration)
    );
    _campaignStorage[totalCampaign] = _newCampaign;
    totalCampaign += 1;
    emit NewCampaign(
      _newCampaign.startDate,
      _newCampaign.endDate,
      _newCampaign.numberOfLockDays,
      _newCampaign.maxAmountOfToken,
      _newCampaign.maxNumberOfBoxes,
      _newCampaign.tokenAddress
    );
  }

  function calculatePendingBoxes(UserStakingSlot memory userStakingSlot, StakingCampaign memory campaign)
    private
    view
    returns (uint256)
  {
    return
      (userStakingSlot.stakingAmountOfToken *
        (block.timestamp - userStakingSlot.lastStakingDate) *
        campaign.returnRate) / 1000000;
  }

  function getCurrentUserReward(uint256 _campaignId) public view returns (uint256) {
    return _userStakingSlot[_campaignId][msg.sender].stakedAmountOfBoxes;
  }

  function staking(uint256 _campaignId, uint256 _amountOfToken) external returns (bool) {
    StakingCampaign memory _currentCampaign = _campaignStorage[_campaignId];
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[_campaignId][msg.sender];
    ERC20 currentToken = ERC20(_currentCampaign.tokenAddress);

    require(block.timestamp >= _currentCampaign.startDate, 'Staking: This staking event has not yet starting');
    require(block.timestamp < _currentCampaign.endDate, 'Staking: This stacking event has been expired');
    require(
      currentUserStakingSlot.stakingAmountOfToken + _amountOfToken <= _currentCampaign.limitStakingAmountForUser,
      'Staking: Token limit per user exceeded'
    );

    if (currentUserStakingSlot.stakingAmountOfToken == 0) {
      currentUserStakingSlot.startStakingDate = uint64(block.timestamp);
      currentUserStakingSlot.lastStakingDate = uint64(block.timestamp);
    }

    uint256 beforeBalance = currentToken.balanceOf(address(this));
    currentToken.safeTransferFrom(msg.sender, address(this), _amountOfToken);
    uint256 afterBalance = currentToken.balanceOf(address(this));
    require(afterBalance - beforeBalance == _amountOfToken, 'Stacking: Invalid token transfer');

    _currentCampaign.stakedAmountOfToken += _amountOfToken;
    require(_currentCampaign.stakedAmountOfToken <= _currentCampaign.maxAmountOfToken, 'Staking: Token limit exceeded');
    _campaignStorage[_campaignId] = _currentCampaign;

    currentUserStakingSlot.stakedAmountOfBoxes += calculatePendingBoxes(currentUserStakingSlot, _currentCampaign);
    currentUserStakingSlot.lastStakingDate = uint64(block.timestamp);
    currentUserStakingSlot.stakingAmountOfToken += _amountOfToken;

    _userStakingSlot[_campaignId][msg.sender] = currentUserStakingSlot;
    emit Staking(msg.sender, _amountOfToken, block.timestamp);
    return true;
  }

  function unStaking(uint256 _campaignId, address senderAddress) external returns (bool) {
    UserStakingSlot memory currentUserStakingSlot = _userStakingSlot[_campaignId][msg.sender];
    StakingCampaign memory _currentCampaign = _campaignStorage[_campaignId];
    ERC20 currentToken = ERC20(_currentCampaign.tokenAddress);

    require(currentUserStakingSlot.stakingAmountOfToken > 0, 'Staking: No token to be unstacked');
    require(msg.sender == senderAddress, 'Staking: Require owner to unstack');

    // User unstack before lockTime and in duration event
    // will be paid for penalty fee
    uint64 lastDate = uint64(block.timestamp) > _currentCampaign.endDate ? _currentCampaign.endDate : uint64(block.timestamp);
    uint64 stackingDuration = (lastDate - currentUserStakingSlot.startStakingDate) / (1 days);
    if (stackingDuration < _currentCampaign.numberOfLockDays && block.timestamp <= _currentCampaign.endDate) {
      currentToken.safeTransferFrom(
        address(this),
        msg.sender,
        (currentUserStakingSlot.stakingAmountOfToken * 98) / 100
      );

      currentUserStakingSlot.stakedAmountOfBoxes = 0;
      currentUserStakingSlot.stakingAmountOfToken = 0;
      _userStakingSlot[_campaignId][msg.sender] = currentUserStakingSlot;
      emit Unstaking(msg.sender, currentUserStakingSlot.stakingAmountOfToken, block.timestamp);
      return true;
    }

    // TODO: Issue boxes to user here
    // mintBoxes()
    currentToken.safeTransferFrom(address(this), msg.sender, currentUserStakingSlot.stakingAmountOfToken);

    currentUserStakingSlot.stakedAmountOfBoxes = 0;
    currentUserStakingSlot.stakingAmountOfToken = 0;
    _userStakingSlot[_campaignId][msg.sender] = currentUserStakingSlot;
    emit Unstaking(msg.sender, currentUserStakingSlot.stakingAmountOfToken, block.timestamp);
    return true;
  }

  function getBlockTime() public view returns (uint256) {
    return block.timestamp;
  }
}
