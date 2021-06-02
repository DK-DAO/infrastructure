// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '../libraries/TokenMetadata.sol';

interface IDAOToken {
  function init(TokenMetadata.Metadata memory metadata) external;
}
