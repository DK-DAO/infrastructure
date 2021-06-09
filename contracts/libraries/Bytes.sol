// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

library Bytes {
  function toBytes32Array(bytes memory input) internal pure returns (bytes32[] memory result) {
    require(input.length % 32 == 0, 'Bytes: invalid data length should divied by 32');
    assembly {
      // Read length of data from offset
      let length := mload(input)

      // Seek offset to the beginning
      let offset := add(input, 0x20)

      // Allocate free mem from free pointer
      result := mload(0x40)

      // Next is size of chunk
      mstore(result, div(length, 0x20))
      let resultOffset := add(result, 0x20)

      for {
        let i := 0
      } lt(i, length) {
        i := add(i, 0x20)
      } {
        mstore(resultOffset, mload(add(offset, i)))
        resultOffset := add(resultOffset, 0x20)
      }
      // Assign new value to the free pointer
      mstore(0x40, resultOffset)
    }
  }
}
