// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../libraries/MultiOwner.sol';

/**
 * CardSale Wallet
 * Name: No name
 * Domain: Duelist King
 */
contract CardSaleWallet is MultiOwner {
  // Init target address once and can't change
  address private immutable _target;

  mapping(address => bool) private _owners;

  constructor(address target_, address[] memory owners_) MultiOwner(owners_) {
    _target = target_;
  }

  receive() external payable {
    payable(_target).transfer(address(this).balance);
  }

  /*******************************************************
   * Owner section
   ********************************************************/

  // Transfer ownership to new owner
  function transferOwnership(address newOwner) external onlyListedOwner {
    // New owner will be activated after 1 hours
    _transferOwnership(newOwner, 1 hours);
  }

  // Withdraw token to multisign wallet
  function withdraw(address[] memory tokens) external onlyListedOwner {
    for (uint256 i = 0; i < tokens.length; i += 1) {
      IERC20 token = IERC20(tokens[i]);
      // Transfer anything
      token.transfer(_target, token.balanceOf(address(this)));
    }
  }
}
