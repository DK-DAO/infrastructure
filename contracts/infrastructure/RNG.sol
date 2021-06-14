// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../libraries/User.sol';
import '../libraries/Bytes.sol';
import '../interfaces/IRNGConsumer.sol';

/**
 * Random Number Generator
 * Name: RNG
 * Domain: DKDAO Infrastructure
 */
contract RNG is User, Ownable {
  // Use bytes lib for bytes
  using Bytes for bytes;

  // Commit scheme data
  struct CommitSchemeProgress {
    uint256 committed;
    uint256 revealed;
    address oracle;
    uint256 lasReveal;
  }

  // Total committed digest
  uint256 private currentCommitted;

  // Secret digests map
  mapping(uint256 => bytes32) private secretDigests;

  // Total revealed secret
  uint256 private currentRevealed;

  // Revealed secret values map
  mapping(uint256 => bytes32) private secretValues;

  // Oracle address
  address private oracle;

  // Last reveal number
  uint256 private lastReveal;

  // Events
  event Committed(uint256 indexed index, bytes32 indexed digest);
  event Revealed(uint256 indexed index, uint256 indexed s, uint256 indexed t);

  // Pass constructor parameter to User
  constructor(address _registry, bytes32 _domain) {
    init(_registry, _domain);
  }

  // DKDAO Oracle will commit H(S||t) to blockchain
  function commit(bytes32 digest) external onlyAllowSameDomain(bytes32('Oracle')) returns (uint256) {
    return _commit(digest);
  }

  // Allow Oracle to commit multiple values to blockchain
  function batchCommit(bytes calldata digest) external onlyAllowSameDomain(bytes32('Oracle')) returns (bool) {
    bytes32[] memory digestList = digest.toBytes32Array();
    for (uint256 i = 0; i < digestList.length; i += 1) {
      require(_commit(digestList[i]) > 0, 'RNG: Unable to add digest to blockchain');
    }
    return true;
  }

  // DKDAO Oracle will reveal S and t
  function reveal(bytes memory data) external onlyAllowSameDomain(bytes32('Oracle')) returns (uint256) {
    require(data.length >= 52, 'RNG: Input data has wrong format');
    uint256 secret = data.readUint256(0);
    address target = data.readAddress(32);
    uint256 s;
    uint256 t;
    // We begin from 1 instead of 0 to prevent error
    currentRevealed += 1;
    t = secret & 0xffffffffffffffff;
    s = secret >> 64;
    // We won't allow invalid timestamp
    require(t >= lastReveal, 'RNG: Invalid time stamp');
    require(keccak256(abi.encodePacked(secret)) == secretDigests[currentRevealed], "Rng: Secret doesn't match digest");
    secretValues[currentRevealed] = bytes32(secret);
    // Increase last reveal value
    lastReveal = t;
    // Hook call to fair distribution
    if (target != address(0x00)) {
      require(
        IRNGConsumer(target).compute(secret, data.readBytes(52, data.length - 52)),
        "RNG: Can't do callback to distributor"
      );
    }
    emit Revealed(currentRevealed, s, t);
    return currentRevealed;
  }

  // Commit digest to blockchain state
  function _commit(bytes32 digest) internal returns (uint256) {
    // We begin from 1 instead of 0 to prevent error
    currentCommitted += 1;
    secretDigests[currentCommitted] = digest;
    emit Committed(currentCommitted, digest);
    return currentCommitted;
  }

  // Get progress of commit scheme
  function getProgress() external view returns (CommitSchemeProgress memory) {
    return
      CommitSchemeProgress({
        committed: currentCommitted,
        revealed: currentRevealed,
        oracle: oracle,
        lasReveal: lastReveal
      });
  }
}
