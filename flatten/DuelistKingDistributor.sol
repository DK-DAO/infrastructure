// Dependency file: contracts/dk/DuelistKingItem.sol

// SPDX-License-Identifier: Apache-2.0

// pragma solidity >=0.8.4 <0.9.0;

/**
 * Item of Duelist King
 * Name: Item
 * Domain: Duelist King
 */
library DuelistKingItem {
  // We have 256 bits to store an item's id so we dicide to contain as much as posible data
  // Entropy         64  bits    Some item need the randomnes value as seed to be openned

  // Edition:         16  bits    For now, 0-Standard edition 0xffff-Creator edition
  // Generation:      16  bits    Generation of item, now it's Gen 0
  // Rareness:        16  bits    1-C, 2-U, 3-R, 4-SR, 5-SSR, 6-L
  // Type:            16  bits    0-Card, 1-Loot Box
  // Id:              64  bits    Increasement value that unique for each item
  // Serial:          64  bits    Increasement value that count the number of items
  // 256         192         176             160            144         128       64            0
  //  |  entropy  |  edition  |  generation   |   rareness   |   type    |   id    |   serial   |
  function set(
    uint256 value,
    uint256 shift,
    uint256 mask,
    uint256 newValue
  ) internal pure returns (uint256 result) {
    require((mask | newValue) ^ mask == 0, 'DuelistKingItem: New value is out range');
    assembly {
      result := and(value, not(shl(shift, mask)))
      result := or(shl(shift, newValue), result)
    }
  }

  function get(
    uint256 value,
    uint256 shift,
    uint256 mask
  ) internal pure returns (uint256 result) {
    assembly {
      result := shr(shift, and(value, shl(shift, mask)))
    }
  }

  function setSerial(uint256 a, uint256 b) internal pure returns (uint256 c) {
    return set(a, 0, 0xffffffffffffffff, b);
  }

  function getSerial(uint256 a) internal pure returns (uint256 c) {
    return get(a, 0, 0xffffffffffffffff);
  }

  function setId(uint256 a, uint256 b) internal pure returns (uint256 c) {
    return set(a, 64, 0xffffffffffffffff, b);
  }

  function getId(uint256 a) internal pure returns (uint256 c) {
    return get(a, 64, 0xffffffffffffffff);
  }

  function setType(uint256 a, uint256 b) internal pure returns (uint256 c) {
    return set(a, 128, 0xffff, b);
  }

  function getType(uint256 a) internal pure returns (uint256 c) {
    return get(a, 128, 0xffff);
  }

  function setRareness(uint256 a, uint256 b) internal pure returns (uint256 c) {
    return set(a, 144, 0xffff, b);
  }

  function getRareness(uint256 a) internal pure returns (uint256 c) {
    return get(a, 144, 0xffff);
  }

  function setGeneration(uint256 a, uint256 b) internal pure returns (uint256 c) {
    return set(a, 160, 0xffff, b);
  }

  function getGeneration(uint256 a) internal pure returns (uint256 c) {
    return get(a, 160, 0xffff);
  }

  function setEdition(uint256 a, uint256 b) internal pure returns (uint256 c) {
    return set(a, 176, 0xffff, b);
  }

  function getEdition(uint256 a) internal pure returns (uint256 c) {
    return get(a, 176, 0xffff);
  }

  function setEntropy(uint256 a, uint256 b) internal pure returns (uint256 c) {
    return set(a, 192, 0xffffffffffffffff, b);
  }

  function getEntropy(uint256 a) internal pure returns (uint256 c) {
    return get(a, 192, 0xffffffffffffffff);
  }
}


// Dependency file: contracts/interfaces/IRNGConsumer.sol

// pragma solidity >=0.8.4 <0.9.0;

interface IRNGConsumer {
  function compute(bytes memory data) external returns (bool);
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


// Dependency file: contracts/libraries/RegistryUser.sol

// pragma solidity >=0.8.4 <0.9.0;

// import 'contracts/interfaces/IRegistry.sol';

abstract contract RegistryUser {
  // Registry contract
  IRegistry internal _registry;

  // Active domain
  bytes32 internal _domain;

  // Initialized
  bool private _initialized = false;

  // Allow same domain calls
  modifier onlyAllowSameDomain(bytes32 name) {
    require(msg.sender == _registry.getAddress(_domain, name), 'UserRegistry: Only allow call from same domain');
    _;
  }

  // Allow cross domain call
  modifier onlyAllowCrossDomain(bytes32 fromDomain, bytes32 name) {
    require(
      msg.sender == _registry.getAddress(fromDomain, name),
      'UserRegistry: Only allow call from allowed cross domain'
    );
    _;
  }

  /*******************************************************
   * Internal section
   ********************************************************/

  // Constructing with registry address and its active domain
  function _registryUserInit(address registry_, bytes32 domain_) internal returns (bool) {
    require(!_initialized, "UserRegistry: It's only able to initialize once");
    _registry = IRegistry(registry_);
    _domain = domain_;
    _initialized = true;
    return true;
  }

  // Get address in the same domain
  function _getAddressSameDomain(bytes32 name) internal view returns (address) {
    return _registry.getAddress(_domain, name);
  }

  /*******************************************************
   * View section
   ********************************************************/

  // Return active domain
  function getDomain() external view returns (bytes32) {
    return _domain;
  }

  // Return registry address
  function getRegistry() external view returns (address) {
    return address(_registry);
  }
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


// Dependency file: contracts/interfaces/ITheDivine.sol

// pragma solidity >=0.8.4 <0.9.0;

interface ITheDivine {
  function rand() external returns (uint256);
}


// Dependency file: contracts/interfaces/INFT.sol

// pragma solidity >=0.8.4 <0.9.0;

interface INFT {
  function init(
    address registry_,
    bytes32 domain_,
    string memory name_,
    string memory symbol_,
    string memory uri_
  ) external returns (bool);

  function safeTransfer(
    address from,
    address to,
    uint256 tokenId
  ) external returns (bool);

  function ownerOf(uint256 tokenId) external view returns (address);

  function mint(address to, uint256 tokenId) external returns (bool);

  function burn(uint256 tokenId) external returns (bool);

  function changeBaseURI(string memory uri_) external returns (bool);
}


// Root file: contracts/dk/DuelistKingDistributor.sol


pragma solidity >=0.8.4 <0.9.0;

// import 'contracts/dk/DuelistKingItem.sol';
// import 'contracts/interfaces/IRNGConsumer.sol';
// import 'contracts/libraries/RegistryUser.sol';
// import 'contracts/libraries/Bytes.sol';
// import 'contracts/interfaces/ITheDivine.sol';
// import 'contracts/interfaces/INFT.sol';

/**
 * Card distributor
 * Name: Distributor
 * Domain: Duelist King
 */
contract DuelistKingDistributor is RegistryUser, IRNGConsumer {
  // Using Bytes for bytes
  using Bytes for bytes;

  // Using Duelist King Item for uint256
  using DuelistKingItem for uint256;

  // Item's serial
  uint256 private _itemSerial;

  // Card's serial
  uint256 private _cardSerial;

  // Default capped is 1,000,000 boxes
  uint256 private _capped = 1000000;

  // The Divine
  ITheDivine private immutable _theDivine;

  // Maping genesis
  mapping(uint256 => uint256) private _genesisEdition;

  // Map minted boxes
  mapping(uint256 => uint256) private _mintedBoxes;

  // Entropy data
  uint256 private _entropy;

  // New genesis card
  event NewGenesisCard(address indexed owner, uint256 indexed carId, uint256 indexed nftTokenId);

  constructor(
    address registry_,
    bytes32 domain_,
    address divine
  ) {
    _theDivine = ITheDivine(divine);
    _registryUserInit(registry_, domain_);
  }

  // Adding entropy to the pool
  function compute(bytes memory data) external override onlyAllowCrossDomain('Infrastructure', 'RNG') returns (bool) {
    require(data.length == 32, 'Distributor: Data must be 32 in length');
    // We combine random value with The Divine's result to prevent manipulation
    // https://github.com/chiro-hiro/thedivine
    _entropy ^= uint256(data.readUint256(0)) ^ _theDivine.rand();
    return true;
  }

  /*******************************************************
   * Public section
   ********************************************************/

  // Anyone would able to help owner claim boxes
  function claimCards(address owner, bytes memory nftIds) external {
    // Get nft
    INFT nft = INFT(_registry.getAddress(_domain, 'NFT'));
    // Make sure that number of id length is valid
    require(nftIds.length % 32 == 0, 'Distributor: Invalid length of NFT IDs');
    for (uint256 i = 0; i < nftIds.length; i += 32) {
      uint256 nftId = nftIds.readUint256(i);
      // We only able to claim openned boxes
      require(nftId.getType() == 1 && nftId.getEntropy() > 0, 'Distributor: Invalid box id');
      // Claim cards from open boxes
      require(_claimCardsInBox(owner, nftId), 'Distributor: Unable to claim cards in the box');
      // Burn claimed box after open
      require(nft.ownerOf(nftId) == owner && nft.burn(nftId), 'Distributor: Unable to burn claimed box');
    }
  }

  // Only owner able to open boxes
  function openBoxes(bytes memory nftIds) external {
    INFT nft = INFT(_registry.getAddress(_domain, 'NFT'));
    address owner = msg.sender;
    require(nftIds.length % 32 == 0, 'Distributor: Invalid length of NFT IDs');
    uint256 rand = uint256(keccak256(abi.encodePacked(_entropy, owner)));
    uint256 j = 0;
    for (uint256 i = 0; i < nftIds.length; i += 32) {
      uint256 nftId = nftIds.readUint256(i);
      require(nftId.getType() == 1 && nftId.getEntropy() == 0, 'Distributor: Only able to open unopened boxes');
      if (j >= 256) {
        rand = uint256(keccak256(abi.encodePacked(_entropy)));
        j = 0;
      }
      require(
        nft.ownerOf(nftId) == owner &&
          nft.burn(nftId) &&
          nft.mint(owner, nftId.setEntropy((rand >> j) & 0xffffffffffffffff)),
        'Distributor: Unable to burn old box and issue opened box'
      );
      j += 64;
    }
  }

  /*******************************************************
   * Oracle section
   ********************************************************/

  // Mint boxes
  function mintBoxes(
    address owner,
    uint256 numberOfBoxes,
    uint256 boxId
  ) external onlyAllowSameDomain('Oracle') returns (bool) {
    require(numberOfBoxes > 0 && numberOfBoxes <= 1000, 'Distributor: Invalid number of boxes');
    require(boxId >= 1, 'Distributor: Invalid box id');
    require(_mintedBoxes[boxId] > _capped, 'Distributor: We run out of this box');
    bool isSuccess = true;
    for (uint256 i = 0; i < numberOfBoxes; i += 1) {
      isSuccess = isSuccess && _issueItem(owner, uint256(0).setType(1).setId(boxId)) > 0;
    }
    require(isSuccess, 'Distributor: We were not able to mint boxes');
    _mintedBoxes[boxId] += numberOfBoxes;
    return isSuccess;
  }

  // Issue genesis edition for card creator
  function issueGenesisCard(
    address owner,
    uint256 generation,
    uint256 id
  ) external onlyAllowSameDomain('Oracle') returns (uint256) {
    require(_genesisEdition[id] == 0, 'Distributor: Only one genesis edition will be distributed');
    uint256 issueCard = _issueCard(
      owner,
      uint256(0x0000000000000000ffff00000000000000000000000000000000000000000000).setGeneration(generation).setId(id)
    );
    _genesisEdition[id] = issueCard;
    emit NewGenesisCard(owner, id, issueCard);
    return issueCard;
  }

  /*******************************************************
   * Private section
   ********************************************************/

  // Open loot boxes
  function _claimCardsInBox(address owner, uint256 boxNftTokenId) private returns (bool) {
    INFT nft = INFT(_registry.getAddress(_domain, 'NFT'));
    // Read entropy from openned card
    uint256 rand = uint256(keccak256(abi.encodePacked(boxNftTokenId.getEntropy())));
    // Box Id is equal to phase of card
    uint256 boxId = boxNftTokenId.getId();
    // 20 phases = 1 gen
    uint256 generation = boxId / 20;
    // Start point
    uint256 startPoint = boxId * 20 - 20;
    // Serial of card
    uint256 serial = _cardSerial;
    for (uint256 i = 0; i < 5; ) {
      // Repeat hash on its selft
      rand = uint256(keccak256(abi.encodePacked(rand)));
      for (uint256 j = 0; j < 256 && i < 5; j += 32) {
        uint256 luckyNumber = (rand >> j) & 0xffffffff;
        // Draw card by lucky number
        uint256 card = _caculateCard(startPoint, luckyNumber);
        if (card > 0) {
          serial += 1;
          require(
            nft.mint(owner, card.setGeneration(generation).setSerial(serial)),
            'Distributor: Can not mint NFT card'
          );
          i += 1;
        }
      }
    }
    // Update card's serial
    _cardSerial = serial;
    // Update old random with new one
    _entropy = rand;
    return true;
  }

  // Issue card
  function _issueCard(address owner, uint256 baseCardId) private returns (uint256) {
    _cardSerial += 1;
    // Overwrite item type with 0
    return _mint(owner, baseCardId.setType(0).setSerial(_cardSerial));
  }

  // Issue other item
  function _issueItem(address owner, uint256 baseItemId) private returns (uint256) {
    _itemSerial += 1;
    // Overite item's serial
    return _mint(owner, baseItemId.setSerial(_itemSerial));
  }

  function _mint(address owner, uint256 nftTokenId) private returns (uint256) {
    if (INFT(_registry.getAddress(_domain, 'NFT')).mint(owner, nftTokenId)) {
      return nftTokenId;
    }
    return 0;
  }

  // Calcualte card
  function _caculateCard(uint256 startPoint, uint256 luckyNumber) private view returns (uint256) {
    // Draw value from luckey number
    uint256 luckyDraw = luckyNumber % (_capped * 5);
    // Card distribution
    uint256[6] memory distribution = [
      uint256(0x00000000000000000000000000000001000000000000000600000000000009c4),
      uint256(0x000000000000000000000000000000020000000100000005000009c400006b6c),
      uint256(0x00000000000000000000000000000003000000030000000400006b6c00043bfc),
      uint256(0x00000000000000000000000000000004000000060000000300043bfc000fadac),
      uint256(0x000000000000000000000000000000050000000a00000002000fadac0026910c),
      uint256(0x000000000000000000000000000000050000000f000000010026910c004c4b40)
    ];
    for (uint256 i = 0; i < distribution.length; i += 1) {
      uint256 t = distribution[i];
      uint256 rEnd = t & 0xffffffff;
      uint256 rStart = (t >> 32) & 0xffffffff;
      uint256 rareness = (t >> 64) & 0xffffffff;
      uint256 cardStart = (t >> 96) & 0xffffffff;
      uint256 cardFactor = (t >> 128) & 0xffffffff;
      if (luckyDraw >= rStart && luckyDraw <= rEnd) {
        // Return card Id
        return uint256(0).setRareness(rareness).setId(startPoint + cardStart + (luckyNumber % cardFactor));
      }
    }
    return 0;
  }

  /*******************************************************
   * View section
   ********************************************************/

  // Get remaining box of a phase
  function getRemainingBox(uint256 boxId) external view returns (uint256) {
    return _capped - _mintedBoxes[boxId];
  }

  // Get genesis token id of given card ID
  function getGenesisEdittion(uint256 cardId) external view returns (uint256) {
    return _genesisEdition[cardId];
  }
}
