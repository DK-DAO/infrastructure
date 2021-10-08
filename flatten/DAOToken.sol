// Dependency file: @openzeppelin/contracts/token/ERC20/IERC20.sol

// SPDX-License-Identifier: MIT

// pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


// Dependency file: @openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol


// pragma solidity ^0.8.0;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Interface for the optional metadata functions from the ERC20 standard.
 *
 * _Available since v4.1._
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}


// Dependency file: @openzeppelin/contracts/utils/Context.sol


// pragma solidity ^0.8.0;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}


// Dependency file: contracts/libraries/ERC20.sol


// pragma solidity ^0.8.0;

// import '/Users/chiro/GitHub/infrastructure/node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol';
// import '/Users/chiro/GitHub/infrastructure/node_modules/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
// import '/Users/chiro/GitHub/infrastructure/node_modules/@openzeppelin/contracts/utils/Context.sol';

/**
 * @dev Implementation of the {IERC20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 * For a generic mechanism see {ERC20PresetMinterPauser}.
 *
 * TIP: For a detailed writeup see our guide
 * https://forum.zeppelin.solutions/t/how-to-implement-erc20-supply-mechanisms/226[How
 * to implement supply mechanisms].
 *
 * We have followed general OpenZeppelin Contracts guidelines: functions revert
 * instead returning `false` on failure. This behavior is nonetheless
 * conventional and does not conflict with the expectations of ERC20
 * applications.
 *
 * Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 * This allows applications to reconstruct the allowance for all accounts just
 * by listening to said events. Other implementations of the EIP may not emit
 * these events, as it isn't required by the specification.
 *
 * Finally, the non-standard {decreaseAllowance} and {increaseAllowance}
 * functions have been added to mitigate the well-known issues around setting
 * allowances. See {IERC20-approve}.
 */
contract ERC20 is Context, IERC20, IERC20Metadata {
  mapping(address => uint256) private _balances;

  mapping(address => mapping(address => uint256)) private _allowances;

  uint256 private _totalSupply;

  // Token name
  string private _name;

  // Token symbol
  string private _symbol;

  // Initialized
  bool private _initialized = false;

  /**
   * @dev Sets the values for {name} and {symbol}.
   *
   * The default value of {decimals} is 18. To select a different value for
   * {decimals} you should overload it.
   *
   * All two of these values are immutable: they can only be set once during
   * construction.
   */
  function _erc20Init(string memory name_, string memory symbol_) internal returns (bool) {
    require(!_initialized, "ERC20: It's only able to initialize once");
    _name = name_;
    _symbol = symbol_;
    return true;
  }

  /**
   * @dev Returns the name of the token.
   */
  function name() public view virtual override returns (string memory) {
    return _name;
  }

  /**
   * @dev Returns the symbol of the token, usually a shorter version of the
   * name.
   */
  function symbol() public view virtual override returns (string memory) {
    return _symbol;
  }

  /**
   * @dev Returns the number of decimals used to get its user representation.
   * For example, if `decimals` equals `2`, a balance of `505` tokens should
   * be displayed to a user as `5.05` (`505 / 10 ** 2`).
   *
   * Tokens usually opt for a value of 18, imitating the relationship between
   * Ether and Wei. This is the value {ERC20} uses, unless this function is
   * overridden;
   *
   * NOTE: This information is only used for _display_ purposes: it in
   * no way affects any of the arithmetic of the contract, including
   * {IERC20-balanceOf} and {IERC20-transfer}.
   */
  function decimals() public view virtual override returns (uint8) {
    return 18;
  }

  /**
   * @dev See {IERC20-totalSupply}.
   */
  function totalSupply() public view virtual override returns (uint256) {
    return _totalSupply;
  }

  /**
   * @dev See {IERC20-balanceOf}.
   */
  function balanceOf(address account) public view virtual override returns (uint256) {
    return _balances[account];
  }

  /**
   * @dev See {IERC20-transfer}.
   *
   * Requirements:
   *
   * - `recipient` cannot be the zero address.
   * - the caller must have a balance of at least `amount`.
   */
  function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
    _transfer(_msgSender(), recipient, amount);
    return true;
  }

  /**
   * @dev See {IERC20-allowance}.
   */
  function allowance(address owner, address spender) public view virtual override returns (uint256) {
    return _allowances[owner][spender];
  }

  /**
   * @dev See {IERC20-approve}.
   *
   * Requirements:
   *
   * - `spender` cannot be the zero address.
   */
  function approve(address spender, uint256 amount) public virtual override returns (bool) {
    _approve(_msgSender(), spender, amount);
    return true;
  }

  /**
   * @dev See {IERC20-transferFrom}.
   *
   * Emits an {Approval} event indicating the updated allowance. This is not
   * required by the EIP. See the note at the beginning of {ERC20}.
   *
   * Requirements:
   *
   * - `sender` and `recipient` cannot be the zero address.
   * - `sender` must have a balance of at least `amount`.
   * - the caller must have allowance for ``sender``'s tokens of at least
   * `amount`.
   */
  function transferFrom(
    address sender,
    address recipient,
    uint256 amount
  ) public virtual override returns (bool) {
    _transfer(sender, recipient, amount);

    uint256 currentAllowance = _allowances[sender][_msgSender()];
    require(currentAllowance >= amount, 'ERC20: transfer amount exceeds allowance');
    unchecked {
      _approve(sender, _msgSender(), currentAllowance - amount);
    }

    return true;
  }

  /**
   * @dev Atomically increases the allowance granted to `spender` by the caller.
   *
   * This is an alternative to {approve} that can be used as a mitigation for
   * problems described in {IERC20-approve}.
   *
   * Emits an {Approval} event indicating the updated allowance.
   *
   * Requirements:
   *
   * - `spender` cannot be the zero address.
   */
  function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
    _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
    return true;
  }

  /**
   * @dev Atomically decreases the allowance granted to `spender` by the caller.
   *
   * This is an alternative to {approve} that can be used as a mitigation for
   * problems described in {IERC20-approve}.
   *
   * Emits an {Approval} event indicating the updated allowance.
   *
   * Requirements:
   *
   * - `spender` cannot be the zero address.
   * - `spender` must have allowance for the caller of at least
   * `subtractedValue`.
   */
  function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
    uint256 currentAllowance = _allowances[_msgSender()][spender];
    require(currentAllowance >= subtractedValue, 'ERC20: decreased allowance below zero');
    unchecked {
      _approve(_msgSender(), spender, currentAllowance - subtractedValue);
    }

    return true;
  }

  /**
   * @dev Moves `amount` of tokens from `sender` to `recipient`.
   *
   * This internal function is equivalent to {transfer}, and can be used to
   * e.g. implement automatic token fees, slashing mechanisms, etc.
   *
   * Emits a {Transfer} event.
   *
   * Requirements:
   *
   * - `sender` cannot be the zero address.
   * - `recipient` cannot be the zero address.
   * - `sender` must have a balance of at least `amount`.
   */
  function _transfer(
    address sender,
    address recipient,
    uint256 amount
  ) internal virtual {
    require(sender != address(0), 'ERC20: transfer from the zero address');
    require(recipient != address(0), 'ERC20: transfer to the zero address');

    _beforeTokenTransfer(sender, recipient, amount);

    uint256 senderBalance = _balances[sender];
    require(senderBalance >= amount, 'ERC20: transfer amount exceeds balance');
    unchecked {
      _balances[sender] = senderBalance - amount;
    }
    _balances[recipient] += amount;

    emit Transfer(sender, recipient, amount);

    _afterTokenTransfer(sender, recipient, amount);
  }

  /** @dev Creates `amount` tokens and assigns them to `account`, increasing
   * the total supply.
   *
   * Emits a {Transfer} event with `from` set to the zero address.
   *
   * Requirements:
   *
   * - `account` cannot be the zero address.
   */
  function _mint(address account, uint256 amount) internal virtual {
    require(account != address(0), 'ERC20: mint to the zero address');

    _beforeTokenTransfer(address(0), account, amount);

    _totalSupply += amount;
    _balances[account] += amount;
    emit Transfer(address(0), account, amount);

    _afterTokenTransfer(address(0), account, amount);
  }

  /**
   * @dev Destroys `amount` tokens from `account`, reducing the
   * total supply.
   *
   * Emits a {Transfer} event with `to` set to the zero address.
   *
   * Requirements:
   *
   * - `account` cannot be the zero address.
   * - `account` must have at least `amount` tokens.
   */
  function _burn(address account, uint256 amount) internal virtual {
    require(account != address(0), 'ERC20: burn from the zero address');

    _beforeTokenTransfer(account, address(0), amount);

    uint256 accountBalance = _balances[account];
    require(accountBalance >= amount, 'ERC20: burn amount exceeds balance');
    unchecked {
      _balances[account] = accountBalance - amount;
    }
    _totalSupply -= amount;

    emit Transfer(account, address(0), amount);

    _afterTokenTransfer(account, address(0), amount);
  }

  /**
   * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
   *
   * This internal function is equivalent to `approve`, and can be used to
   * e.g. set automatic allowances for certain subsystems, etc.
   *
   * Emits an {Approval} event.
   *
   * Requirements:
   *
   * - `owner` cannot be the zero address.
   * - `spender` cannot be the zero address.
   */
  function _approve(
    address owner,
    address spender,
    uint256 amount
  ) internal virtual {
    require(owner != address(0), 'ERC20: approve from the zero address');
    require(spender != address(0), 'ERC20: approve to the zero address');

    _allowances[owner][spender] = amount;
    emit Approval(owner, spender, amount);
  }

  /**
   * @dev Hook that is called before any transfer of tokens. This includes
   * minting and burning.
   *
   * Calling conditions:
   *
   * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
   * will be transferred to `to`.
   * - when `from` is zero, `amount` tokens will be minted for `to`.
   * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
   * - `from` and `to` are never both zero.
   *
   * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
   */
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {}

  /**
   * @dev Hook that is called after any transfer of tokens. This includes
   * minting and burning.
   *
   * Calling conditions:
   *
   * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
   * has been transferred to `to`.
   * - when `from` is zero, `amount` tokens have been minted for `to`.
   * - when `to` is zero, `amount` of ``from``'s tokens have been burned.
   * - `from` and `to` are never both zero.
   *
   * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
   */
  function _afterTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {}
}


// Root file: contracts/DAOToken.sol

pragma solidity >=0.8.4 <0.9.0;

// import 'contracts/libraries/ERC20.sol';

/**
 * DAO Token
 * Name: DAO Token
 * Domain: DKDAO, *
 */
contract DAOToken is ERC20 {
  // Staking structure
  struct StakingData {
    uint256 amount;
    uint128 lockAt;
    uint128 unlockAt;
  }

  // Main staking data storage
  mapping(address => StakingData) stakingStorage;

  // Delegate of stake
  mapping(address => mapping(address => uint256)) delegation;

  // Voting power of an address
  mapping(address => uint256) votePower;

  // Staking event
  event Staking(address indexed owner, uint256 indexed amount, uint256 indexed lockTime);

  // Unstaking event
  event Unstaking(address indexed owner, uint256 indexed amount, uint256 indexed unlockTime);

  // Delegate event
  event Delegate(address indexed owner, address indexed delegate, uint256 indexed amount);

  // Stop delegation event
  event StopDelegate(address indexed owner, address indexed delegate, uint256 indexed amount);

  // Constructing with token Metadata
  function init(
    string memory name,
    string memory symbol,
    address genesis,
    uint256 supply
  ) external returns (bool) {
    // Set name and symbol to DAO Token
    _erc20Init(name, symbol);
    // Mint token to genesis address
    _mint(genesis, supply * (10**decimals()));
    return true;
  }

  /*******************************************************
   * Same domain section
   ********************************************************/

  // Override {transferFrom} method
  function transferFrom(
    address sender,
    address recipient,
    uint256 amount
  ) public override returns (bool) {
    // Make sure owner only able to transfer available token
    require(amount <= _available(sender), "DAOToken: You can't transfer larger than available amount");
    uint256 currentAllowance = allowance(sender, _msgSender());

    require(currentAllowance >= amount, 'ERC20: transfer amount exceeds allowance');
    _transfer(sender, recipient, amount);
    _approve(sender, _msgSender(), currentAllowance - amount);
    return true;
  }

  // Override {transfer} method
  function transfer(address recipient, uint256 amount) public override returns (bool) {
    // Make sure owner only able to transfer available token
    require(amount <= _available(_msgSender()), "DAOToken: You can't transfer larger than available amount");
    _transfer(_msgSender(), recipient, amount);
    return true;
  }

  // Staking an amount of token
  function staking(uint256 amount, address delegate) external returns (bool) {
    address owner = _msgSender();
    StakingData memory stakingData = stakingStorage[owner];
    require(
      amount <= _available(owner),
      "DAOToken: Staking amount can't be geater than your current available balance"
    );
    // Increase staking amount
    stakingData.amount += amount;
    stakingData.lockAt = uint128(block.timestamp);
    stakingData.unlockAt = 0;
    // Increase vote power based on delegate status
    if (delegate != address(0)) {
      delegation[owner][delegate] = amount;
      votePower[delegate] += amount;
      // Fire deleaget event
      emit Delegate(owner, delegate, amount);
    } else {
      votePower[owner] += amount;
      // Fire self delegate event
      emit Delegate(owner, owner, amount);
    }
    // Store staking to storage
    stakingStorage[owner] = stakingData;
    // Fire staking event
    emit Staking(owner, amount, stakingData.lockAt);
    return true;
  }

  // Unstaking balance in the next 15 days
  function unstaking() external returns (bool) {
    address owner = _msgSender();
    StakingData memory stakingData = stakingStorage[owner];
    require(stakingData.amount > 0, 'DAOToken: Unstaking amount must greater than 0');
    // Set unlock time to next 15 days
    stakingData.unlockAt = uint128(block.timestamp + 7 days);
    // Set lock time to 0
    stakingData.lockAt = 0;
    // Update back data to staking storage
    stakingStorage[owner] = stakingData;
    // Fire unstaking event
    emit Unstaking(owner, stakingData.amount, stakingData.unlockAt);
    return true;
  }

  // Withdraw unstaked balance back to transferable balance
  function withdraw(address[] memory delegates) external returns (bool) {
    address owner = _msgSender();
    StakingData memory stakingData = stakingStorage[owner];
    // Temporary variable to redurce gas cost
    uint256 ownerVotePower = votePower[owner];
    uint256 delegatedPower;
    // Make sure there are remaining staking balance and locking period was passed
    require(stakingData.amount > 0, 'DAOToken: Unstaking amount must greater than 0');
    require(block.timestamp > stakingData.unlockAt, 'DAOToken: The unlocking period was not passed');
    // Return vote power from delegates to owner
    for (uint256 i = 0; i < delegates.length; i += 1) {
      delegatedPower = delegation[owner][delegates[i]];
      ownerVotePower += delegatedPower;
      emit StopDelegate(owner, delegates[i], delegatedPower);
      delegation[owner][delegates[i]] = 0;
    }
    // Remove vote power from staking amount
    stakingData.amount -= ownerVotePower;
    // Reset vote power after remove from staking amount
    votePower[owner] = 0;
    // Update staking data
    stakingStorage[owner] = stakingData;
    return true;
  }

  /*******************************************************
   * View section
   ********************************************************/

  // Check transferable balance
  function _available(address owner) private view returns (uint256) {
    return balanceOf(owner) - stakingStorage[owner].amount;
  }

  // Get balance info at once
  function getBalance(address owner)
    external
    view
    returns (
      uint256 available,
      uint256 balance,
      StakingData memory stakingData
    )
  {
    return (_available(owner), balanceOf(owner), stakingStorage[owner]);
  }

  // Calculate voting power
  function calculatePower(address owner) external view returns (uint256) {
    // If token is locked and no unlocking
    if (isStaked(owner)) {
      return votePower[owner];
    }
    return 0;
  }

  // Is completed unlock?
  function isUnstaked(address owner) public view returns (bool) {
    StakingData memory stakingData = stakingStorage[owner];
    // Completed unlocked where they didn't lock or the unlocking period was over
    return stakingData.lockAt == 0 && (block.timestamp > stakingData.unlockAt || stakingData.amount == 0);
  }

  // Is completed lock?
  function isStaked(address owner) public view returns (bool) {
    return stakingStorage[owner].lockAt > 0;
  }
}
