// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

interface IUser {
  function init(address _registry, bytes32 _domain) external;
}
