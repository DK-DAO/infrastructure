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
  // Constructing with token Metadata
  function init(TokenMetadata.Metadata memory metadata) external {
    // Set name and symbol
    _init(metadata.name, metadata.symbol);
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
  }
}
