// Dependency file: @openzeppelin/contracts/utils/Context.sol

// SPDX-License-Identifier: MIT

// pragma solidity ^0.8.0;

/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}


// Dependency file: @openzeppelin/contracts/access/Ownable.sol


// pragma solidity ^0.8.0;

// import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _setOwner(_msgSender());
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _setOwner(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _setOwner(newOwner);
    }

    function _setOwner(address newOwner) private {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// Dependency file: contracts/interfaces/INFT.sol

// pragma solidity >=0.8.4 <0.9.0;

interface INFT {
  function init(
    string memory name_,
    string memory symbol_,
    address registry,
    bytes32 domain
  ) external returns (bool);

  function safeTransfer(
    address from,
    address to,
    uint256 tokenId
  ) external returns (bool);

  function mint(address to, uint256 tokenId) external returns (bool);
}


// Dependency file: contracts/libraries/Bytes.sol

// pragma solidity >=0.8.4 <0.9.0;

library Bytes {
  // Convert bytes to bytes32[]
  function toBytes32Array(bytes memory input) internal pure returns (bytes32[] memory) {
    require(input.length % 32 == 0, 'Bytes: invalid data length should divied by 32');
    bytes32[] memory result = new bytes32[](input.length / 32);
    assembly {
      // Read length of data from offset
      let length := mload(input)

      // Seek offset to the beginning
      let offset := add(input, 0x20)

      // Next is size of chunk
      let resultOffset := add(result, 0x20)

      for {
        let i := 0
      } lt(i, length) {
        i := add(i, 0x20)
      } {
        mstore(resultOffset, mload(add(offset, i)))
        resultOffset := add(resultOffset, 0x20)
      }
    }
    return result;
  }

  // Read address from input bytes buffer
  function readAddress(bytes memory input, uint256 offset) internal pure returns (address result) {
    require(offset + 20 <= input.length, 'Bytes: Our of range, can not read address from bytes');
    assembly {
      result := shr(96, mload(add(add(input, 0x20), offset)))
    }
  }

  // Read uint256 from input bytes buffer
  function readUint256(bytes memory input, uint256 offset) internal pure returns (uint256 result) {
    require(offset + 32 <= input.length, 'Bytes: Our of range, can not read uint256 from bytes');
    assembly {
      result := mload(add(add(input, 0x20), offset))
    }
  }

  // Read bytes from input bytes buffer
  function readBytes(
    bytes memory input,
    uint256 offset,
    uint256 length
  ) internal pure returns (bytes memory) {
    require(offset + length <= input.length, 'Bytes: Our of range, can not read bytes from bytes');
    bytes memory result = new bytes(length);
    assembly {
      // Seek offset to the beginning
      let seek := add(add(input, 0x20), offset)

      // Next is size of data
      let resultOffset := add(result, 0x20)

      for {
        let i := 0
      } lt(i, length) {
        i := add(i, 0x20)
      } {
        mstore(add(resultOffset, i), mload(add(seek, i)))
      }
    }
    return result;
  }
}


// Dependency file: contracts/libraries/Verifier.sol

// pragma solidity >=0.8.4 <0.9.0;

library Verifier {
  function verifySerialized(bytes memory message, bytes memory signature) public pure returns (address) {
    bytes32 r;
    bytes32 s;
    uint8 v;
    assembly {
      // Singature need to be 65 in length
      // if (signature.length !== 65) revert();
      if iszero(eq(mload(signature), 65)) {
        revert(0, 0)
      }
      // r = signature[:32]
      // s = signature[32:64]
      // v = signature[64]
      r := mload(add(signature, 0x20))
      s := mload(add(signature, 0x40))
      v := byte(0, mload(add(signature, 0x60)))
      // Invalid v value, for Ethereum it's only possible to be 27, 28 and 0, 1 in legacy code
      if lt(v, 27) {
        v := add(v, 27)
      }
      if iszero(or(eq(v, 27), eq(v, 28))) {
        revert(0, 0)
      }
    }

    // Get hashes of message with Ethereum proof prefix
    bytes32 hashes = keccak256(abi.encodePacked('\x19Ethereum Signed Message:\n', uintToStr(message.length), message));

    return ecrecover(hashes, v, r, s);
  }

  function verify(
    bytes memory message,
    bytes32 r,
    bytes32 s,
    uint8 v
  ) public pure returns (address) {
    if (v < 27) {
      v += 27;
    }
    // V must be 27 or 28
    require(v == 27 || v == 28, 'Invalid v value');
    // Get hashes of message with Ethereum proof prefix
    bytes32 hashes = keccak256(abi.encodePacked('\x19Ethereum Signed Message:\n', uintToStr(message.length), message));

    return ecrecover(hashes, v, r, s);
  }

  function uintToStr(uint256 value) public pure returns (bytes memory result) {
    assembly {
      switch value
      case 0 {
        // In case of 0, we just return "0"
        result := mload(0x40)
        // result.length = 1
        mstore(result, 0x01)
        // result = "0"
        mstore(add(result, 0x20), 0x30)
      }
      default {
        let length := 0x0
        // let result = new bytes(32)
        result := mload(0x40)

        // Get length of render number
        // for (let v := value; v > 0; v = v / 10)
        for {
          let v := value
        } gt(v, 0x00) {
          v := div(v, 0x0a)
        } {
          length := add(length, 0x01)
        }

        // We're only support number with 32 digits
        // if (length > 32) revert();
        if gt(length, 0x20) {
          revert(0, 0)
        }

        // Set length of result
        mstore(result, length)

        // Start render result
        // for (let v := value; length > 0; v = v / 10)
        for {
          let v := value
        } gt(length, 0x00) {
          v := div(v, 0x0a)
        } {
          // result[--length] = 48 + (v % 10)
          length := sub(length, 0x01)
          mstore8(add(add(result, 0x20), length), add(0x30, mod(v, 0x0a)))
        }
      }
    }
  }
}


// Dependency file: contracts/interfaces/IRegistry.sol

// pragma solidity >=0.8.4 <0.9.0;

interface IRegistry {
  event Registered(bytes32 domain, bytes32 indexed name, address indexed addr);

  function isExistRecord(bytes32 domain, bytes32 name) external view returns (bool);

  function set(
    bytes32 domain,
    bytes32 name,
    address addr
  ) external returns (bool);

  function batchSet(
    bytes32[] calldata domains,
    bytes32[] calldata names,
    address[] calldata addrs
  ) external returns (bool);

  function getAddress(bytes32 domain, bytes32 name) external view returns (address);

  function getDomainAndName(address addr) external view returns (bytes32, bytes32);
}


// Dependency file: contracts/libraries/User.sol

// pragma solidity >=0.8.4 <0.9.0;

// import 'contracts/interfaces/IRegistry.sol';

abstract contract User {
  // Registry contract
  IRegistry internal registry;

  // Active domain
  bytes32 internal domain;

  // Allow same domain calls
  modifier onlyAllowSameDomain(bytes32 name) {
    require(msg.sender == registry.getAddress(domain, name), 'User: Only allow call from same domain');
    _;
  }

  // Allow cross domain call
  modifier onlyAllowCrossDomain(bytes32 fromDomain, bytes32 name) {
    require(msg.sender == registry.getAddress(fromDomain, name), 'User: Only allow call from allowed cross domain');
    _;
  }

  // Constructing with registry address and its active domain
  function _init(address _registry, bytes32 _domain) internal returns (bool) {
    require(domain == bytes32(0) && address(registry) == address(0), "User: It's only able to set once");
    registry = IRegistry(_registry);
    domain = _domain;
    return true;
  }

  // Get address in the same domain
  function getAddressSameDomain(bytes32 name) internal view returns (address) {
    return registry.getAddress(domain, name);
  }

  // Return active domain
  function getDomain() external view returns (bytes32) {
    return domain;
  }

  // Return registry address
  function getRegistry() external view returns (address) {
    return address(registry);
  }
}


// Root file: contracts/infrastructure/Swap.sol

pragma solidity >=0.8.4 <0.9.0;

// import '/Users/chiro/GitHub/infrastructure/node_modules/@openzeppelin/contracts/access/Ownable.sol';
// import 'contracts/interfaces/INFT.sol';
// import 'contracts/libraries/Bytes.sol';
// import 'contracts/libraries/Verifier.sol';
// import 'contracts/libraries/User.sol';

/**
 * Swap able to transfer token by
 * Name: Swap
 * Domain: DKDAO Infrastructure
 */
contract Swap is User, Ownable {
  using Verifier for bytes;
  using Bytes for bytes;

  // Partner of duelistking
  mapping(address => bool) private partners;

  // Nonce
  mapping(address => uint256) private nonceStorage;

  // Staking
  mapping(address => mapping(uint256 => uint256)) private stakingStorage;

  // List partner
  event ListPartner(address indexed partnerAddress);

  // Delist partner
  event DelistPartner(address indexed partnerAddress);

  // Start staking
  event StartStaking(address indexed owner, uint256 indexed tokenId, uint256 timestamp);

  // Stop staking
  event StopStaking(address indexed owner, uint256 indexed tokenId, uint256 timestamp);

  // Only allow partner to execute
  modifier onlyPartner() {
    require(partners[msg.sender] == true, 'Swap: Sender was not partner');
    _;
  }

  // Pass constructor parameter to User
  constructor(address _registry, bytes32 _domain) {
    _init(_registry, _domain);
  }

  // User able to delegate transfer right with a cyrptographic proof
  function delegateTransfer(bytes memory proof) external onlyPartner returns (bool) {
    // Check for size of the proof
    require(proof.length == 149, 'Swap: Wrong size of the proof, it must be 149 bytes');
    bytes memory signature = proof.readBytes(0, 65);
    bytes memory message = proof.readBytes(65, proof.length - 65);
    address _from = message.verifySerialized(signature);
    address _to = message.readAddress(0);
    uint256 _value = message.readUint256(20);
    uint256 _nonce = message.readUint256(52);
    // Each nonce is only able to be use once
    require(_nonce - nonceStorage[_from] == 1, 'Swap: Incorrect nonce of signer');
    nonceStorage[_from] += 1;
    return INFT(getAddressSameDomain('NFT')).safeTransfer(_from, _to, _value);
  }

  // Anyone could able to staking their good/items for their own sake
  function startStaking(bytes memory tokenIds) external returns (bool) {
    INFT nft = INFT(getAddressSameDomain('NFT'));
    require(tokenIds.length % 32 == 0, 'Swap: Staking Ids need to be divied by 32');
    for (uint256 i = 0; i < tokenIds.length; i += 32) {
      uint256 tokenId = tokenIds.readUint256(i);
      require(stakingStorage[msg.sender][tokenId] == 0, 'Swap: We are only able to stake, unstaked token');
      // Store starting point of staking
      stakingStorage[msg.sender][tokenId] = block.timestamp;
      emit StartStaking(msg.sender, tokenId, block.timestamp);
      require(
        nft.safeTransfer(msg.sender, 0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa, tokenId),
        'Swap: User should able to transfer their own token to staking address'
      );
    }
    return true;
  }

  // Anyone could able to stop staking their good/items for their own sake
  function stopStaking(bytes memory tokenIds) external returns (bool) {
    INFT nft = INFT(getAddressSameDomain('NFT'));
    require(tokenIds.length % 32 == 0, 'Swap: Staking Ids need to be divied by 32');
    for (uint256 i = 0; i < tokenIds.length; i += 32) {
      uint256 tokenId = tokenIds.readUint256(i);
      require(
        block.timestamp - stakingStorage[msg.sender][tokenId] > 1 days,
        'Swap: You only able to stop staking after at least 1 day'
      );
      require(stakingStorage[msg.sender][tokenId] > 0, 'Swap: You only able to stop staking staked token');
      // Reset staking state
      stakingStorage[msg.sender][tokenId] = 0;
      emit StopStaking(msg.sender, tokenId, block.timestamp);
      require(
        nft.safeTransfer(0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa, msg.sender, tokenId),
        'Swap: User should able to transfer their own token to staking address'
      );
    }
    return true;
  }

  // List a new partner
  function listPartner(address partnerAddress) external onlyOwner returns (bool) {
    partners[partnerAddress] = true;
    emit ListPartner(partnerAddress);
    return true;
  }

  // Delist a partner
  function delistPartner(address partnerAddress) external onlyOwner returns (bool) {
    partners[partnerAddress] = false;
    emit DelistPartner(partnerAddress);
    return true;
  }

  // Get nonce of an address
  function getNonce(address owner) external view returns (uint256) {
    return nonceStorage[owner] + 1;
  }

  // Check an address is partner or not
  function isPartner(address partner) external view returns (bool) {
    return partners[partner];
  }

  // Get staking timestamp of given address and list of token Id
  function getStakingStatus(address owner, bytes memory tokenIds) external view returns (uint256[] memory) {
    require(tokenIds.length % 32 == 0, 'Swap: Staking Ids need to be divied by 32');
    uint256[] memory result = new uint256[](tokenIds.length / 32);
    for (uint256 i = 0; i < tokenIds.length; i += 1) {
      result[i] = stakingStorage[owner][tokenIds.readUint256(i * 32)];
    }
    return result;
  }
}
