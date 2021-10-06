// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

interface IPool {
  function init(address registry, bytes32 domain) external returns (bool);
}
