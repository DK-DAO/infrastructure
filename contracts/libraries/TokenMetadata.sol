// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

abstract contract TokenMetadata {
  // Metadata for DAO token initialization
  struct Metadata {
    string symbol;
    string name;
    address genesis;
    address grandDAO;
    address registry;
    bytes32 domain;
  }
}
