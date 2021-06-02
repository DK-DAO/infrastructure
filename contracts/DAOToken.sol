// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import './libraries/ERC20.sol';
import './libraries/User.sol';
import './libraries/TokenMetadata.sol';

/**
 * DAO token of DAOs
 */
contract DAOToken is User, ERC20 {
  // Mapping locked amount
  mapping(address => uint256) private locked;
  // Mapping address to unlock time
  mapping(address => uint256) private unlockTime;

  // Lock event
  event Lock(address indexed owner, uint256 indexed amount);

  // Unlock event
  event Unlock(address indexed owner, uint256 indexed amount, uint256 indexed unlockTime);

  // Constructing with token Metadata
  function init(TokenMetadata.Metadata memory metadata) external returns (bool) {
    // Set registry and domain to User
    require(super.init(metadata.registry, metadata.domain), "DAOToken: This method can't be trigger twice");
    // Set name and symbol to DAO Token
    _init(metadata.name, metadata.symbol);
    // Setup balance and genesis token distribution
    uint256 unit = 10**decimals();
    // This is child DAO
    if (metadata.grandDAO != address(0)) {
      // Grand DAO will control 10%
      _mint(metadata.grandDAO, 1000000 * unit);
      // Mint 9,000,000 for genesis
      _mint(metadata.genesis, 9000000 * unit);
    } else {
      // Mint 10,000,000 for genesis
      _mint(metadata.genesis, 10000000 * unit);
    }
    return true;
  }

  // Overwrite {transferFrom} method
  function transferFrom(
    address sender,
    address recipient,
    uint256 amount
  ) public override returns (bool) {
    require(amount <= _available(sender), "DAOToken: You can't transfer larger than available amount");
    _transfer(sender, recipient, amount);

    uint256 currentAllowance = allowance(sender, _msgSender());
    require(currentAllowance >= amount, 'ERC20: transfer amount exceeds allowance');
    _approve(sender, _msgSender(), currentAllowance - amount);

    return true;
  }

  // Overwrite {transfer} method
  function transfer(address recipient, uint256 amount) public override returns (bool) {
    require(amount <= _available(_msgSender()), "DAOToken: You can't transfer larger than available amount");
    _transfer(_msgSender(), recipient, amount);
    return true;
  }

  // Lock an amount of token
  function lock(uint256 amount) external returns (bool) {
    address owner = _msgSender();
    uint256 balance = balanceOf(owner);
    require(amount > 0 && amount <= balance, "DAOToken: Lock amount can't be geater than your current balance");
    locked[owner] = amount;
    unlockTime[owner] = 0;
    emit Lock(owner, amount);
    return true;
  }

  // Unlock balance in the next 30 days
  function unlock() external returns (bool) {
    address owner = _msgSender();
    uint256 amount = locked[owner];
    require(amount > 0, 'DAOToken: Unlock amount must greater than 0');
    uint256 unlockAt = block.timestamp + 30 days;
    unlockTime[owner] = unlockAt;
    emit Unlock(owner, amount, unlockAt);
    return true;
  }

  // Check transferable balance
  function _available(address owner) private view returns (uint256) {
    if (isUnlocked(owner)) {
      return balanceOf(owner);
    }
    return balanceOf(owner) - locked[owner];
  }

  // Get balance info at once
  function getBalance(address owner)
    external
    view
    returns (
      uint256 available,
      uint256 balance,
      uint256 unlockAt
    )
  {
    return (_available(owner), balanceOf(owner), unlockTime[owner]);
  }

  // Calculate voting power
  function votePower(address owner) external view returns (uint256) {
    // If token is locked and no unlocking
    if (isLocked(owner)) {
      return locked[owner];
    }
    return 0;
  }

  // Is completed unlock?
  function isUnlocked(address owner) public view returns (bool) {
    // Completed unlocked where they didn't lock or the unlocking period is completed
    return block.timestamp > unlockTime[owner] || locked[owner] == 0;
  }

  // Is completed lock?
  function isLocked(address owner) public view returns (bool) {
    return unlockTime[owner] == 0 && locked[owner] > 0;
  }
}
