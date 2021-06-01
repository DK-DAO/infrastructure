// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './libraries/User.sol';
import './Press.sol';

// Random Number Generator
// Domain: DKDAO Infrastructure
contract RNG is User, Ownable {
  // Total commited digest
  uint256 private currentCommited;

  // Secret digests map
  mapping(uint256 => bytes32) private secretDigests;

  // Total revealed secret
  uint256 private currentRevealed;

  // Revealed secret values map
  mapping(uint256 => bytes32) private secretValues;

  // Oracle address
  address private oracle;

  // Last reveal number
  uint64 private lastReveal;

  // Events
  event Committed(uint256 indexed index, bytes32 indexed digest);
  event Revealed(uint256 indexed index, uint192 indexed s, uint64 indexed t);

  // Duelist King Oracle will commit H(S||t) to blockchain
  function commit(bytes32 digest) external onlyAllowSameDomain(bytes32('Oracle')) returns (uint256) {
    // We begin from 1 instead of 0 to prevent error
    currentCommited += 1;
    secretDigests[currentCommited] = digest;
    emit Committed(currentCommited, digest);
    return currentCommited;
  }

  // Duelist King Oracle will reveal S and t
  function reveal(bytes32 secret) external onlyAllowSameDomain(bytes32('Oracle')) returns (uint256) {
    uint192 s;
    uint64 t;
    // Press is a hub of distributor
    address press = registry.getAddress(domain, bytes32('Press'));
    // We begin from 1 instead of 0 to prevent error
    currentRevealed += 1;
    // Decompose secret to its components
    assembly {
      t := and(t, 0xffffffffffffffff)
      s := shr(64, secret)
    }
    // We won't allow invalid timestamp
    require(t >= lastReveal, 'Rng: Invalid time stamp');
    require(keccak256(abi.encodePacked(secret)) == secretDigests[currentRevealed], "Rng: Secret doesn't match digest");
    secretValues[currentRevealed] = secret;
    // Increase last reveal value
    lastReveal = t;
    // Hook call to fair distribution
    if (press != address(0x00)) {
      require(Press(press).compute(secret), "Rng: Can't do callback to distributor");
    }
    emit Revealed(currentRevealed, s, t);
    return currentRevealed;
  }
}
