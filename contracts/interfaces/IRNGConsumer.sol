// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

interface IRNGConsumer {
  function compute(bytes32 secret) external returns (bool);
}
