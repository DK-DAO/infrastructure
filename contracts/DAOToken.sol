// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import './libraries/ERC20.sol';
import './libraries/TokenMetadata.sol';

/**
 * DAO Token
 * Name: DAO Token
 * Domain: DKDAO, *
 */
contract DAOToken is ERC20 {
  // Lock structure
  struct Lock {
    uint256 amount;
    uint128 lockAt;
    uint128 unlockAt;
  }

  // Mapping locked amount
  mapping(address => Lock) private lockStorage;

  // Lock event
  event TokenLock(address indexed owner, uint256 indexed amount, uint256 lockTime);

  // Unlock event
  event TokenUnlock(address indexed owner, uint256 indexed amount, uint256 indexed unlockTime);

  // Constructing with token Metadata
  function init(TokenMetadata.Metadata memory metadata) external returns (bool) {
    require(totalSupply() == 0, "DAOToken: It's only allowed to called once");
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
    // Store lock to storage
    lockStorage[owner] = Lock({ amount: amount, lockAt: uint128(block.timestamp), unlockAt: 0 });
    emit TokenLock(owner, amount, block.timestamp);
    return true;
  }

  // Unlock balance in the next 15 days
  function unlock() external returns (bool) {
    address owner = _msgSender();
    Lock memory lockData = lockStorage[owner];
    require(lockData.amount > 0, 'DAOToken: Unlock amount must greater than 0');
    // Set unlock time to next 15 days
    lockData.unlockAt = uint128(block.timestamp + 15 days);
    // Set lock time to 0
    lockData.lockAt = 0;
    // Update lock data
    lockStorage[owner] = lockData;
    emit TokenUnlock(owner, lockData.amount, lockData.unlockAt);
    return true;
  }

  // Check transferable balance
  function _available(address owner) private view returns (uint256) {
    if (isUnlocked(owner)) {
      return balanceOf(owner);
    }
    return balanceOf(owner) - lockStorage[owner].amount;
  }

  // Get balance info at once
  function getBalance(address owner)
    external
    view
    returns (
      uint256 available,
      uint256 balance,
      Lock memory unlockAt
    )
  {
    return (_available(owner), balanceOf(owner), lockStorage[owner]);
  }

  // Calculate voting power
  function votePower(address owner) external view returns (uint256) {
    // If token is locked and no unlocking
    if (isLocked(owner)) {
      return lockStorage[owner].amount;
    }
    return 0;
  }

  // Is completed unlock?
  function isUnlocked(address owner) public view returns (bool) {
    Lock memory lockData = lockStorage[owner];
    // Completed unlocked where they didn't lock or the unlocking period was over
    return lockData.lockAt == 0 && (block.timestamp > lockData.unlockAt || lockData.amount == 0);
  }

  // Is completed lock?
  function isLocked(address owner) public view returns (bool) {
    return lockStorage[owner].lockAt > 0;
  }
}
