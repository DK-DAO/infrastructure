// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

interface IRNGConsumer {
  function compute(uint256 secret, bytes memory data) external returns (bool);
}
