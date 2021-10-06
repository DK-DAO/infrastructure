// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IDAOToken is IERC20 {
  function init(
    string memory name,
    string memory symbol,
    address genesis,
    uint256 supply
  ) external;

  function votePower(address owner) external view returns (uint256);
}
