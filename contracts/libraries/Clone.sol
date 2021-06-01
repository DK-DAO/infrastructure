// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

library Clone {
  function clone(address target) internal returns (address payable instance) {
    assembly {
      // Point minimalProxy to the free pointer
      let minimalProxy := mload(0x40)
      // Copy minimal proxy to memory
      mstore(minimalProxy, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
      // Overwrite target address
      mstore(add(minimalProxy, 0x14), target)
      // Copy remaining bytecode of minimal proxy to the memory
      mstore(add(minimalProxy, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
      // Create a new contract with minimal proxy bytecode that pointed to target address
      instance := create(0, minimalProxy, 0x37)
      // Assign a new value to the free pointer
      mstore(0x40, add(minimalProxy, 0x37))
    }
    require(target != address(0), 'Clone: Unable to clone the given target address');
    return instance;
  }
}
