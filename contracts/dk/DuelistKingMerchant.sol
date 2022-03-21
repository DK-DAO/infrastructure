// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '../libraries/RegistryUser.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

/**
 * Duelist King Merchant
 * Name: DuelistKingMerchant
 * Doamin: Duelist King
 */
contract DuelistKingMerchant is RegistryUser {
  using SafeERC20 for ERC20;

  mapping(address => uint256) discountCode;

  struct SaleCampaign {
    uint128 phaseId;
    uint128 totalSale;
    uint128 basePrice;
  }

  // Transfer token to receiver
  function tokenTransfer(
    address tokenAddress,
    address sender,
    address receiver,
    uint256 amount
  ) private returns (bool) {
    ERC20 token = ERC20(tokenAddress);
    uint256 beforeBalance = token.balanceOf(receiver);
    token.safeTransferFrom(sender, receiver, amount);
    uint256 afterBalance = token.balanceOf(receiver);
    require(afterBalance - beforeBalance == amount, 'DKM: Invalid token transfer');
    return true;
  }
}
