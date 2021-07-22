// Dependency file: contracts/interfaces/IRNGConsumer.sol

// SPDX-License-Identifier: MIT
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
    string memory name_,
    string memory symbol_,
    address registry,
    bytes32 domain
  ) external returns (bool);

  function mint(address to, uint256 tokenId) external returns (bool);
}


// Dependency file: contracts/interfaces/IPress.sol

// pragma solidity >=0.8.4 <0.9.0;

interface IPress {
  function newNFT(
    bytes32 _domain,
    string calldata name,
    string calldata symbol
  ) external returns (address);
}


// Root file: contracts/dk/DuelistKingDistributor.sol


pragma solidity >=0.8.4 <0.9.0;

// import 'contracts/interfaces/IRNGConsumer.sol';
// import 'contracts/libraries/User.sol';
// import 'contracts/libraries/Bytes.sol';
// import 'contracts/interfaces/ITheDivine.sol';
// import 'contracts/interfaces/INFT.sol';
// import 'contracts/interfaces/IPress.sol';

/**
 * Card distributor
 * Name: Distributor
 * Domain: Duelist King
 */
contract DuelistKingDistributor is User, IRNGConsumer {
  // Using Bytes for bytes
  using Bytes for bytes;

  // Number of seiral
  uint256 private serial;

  // Uin256 genesis serial
  uint256 private genesisSerial;

  // Campaign index
  uint256 campaignIndex;

  // The Divine
  ITheDivine private immutable theDivine;

  // Card index
  uint256 cardIndex;

  // Card storage
  mapping(uint256 => address) cardStorage;

  // Maping genesis
  mapping(address => uint256) genesisEdition;

  // Entropy data
  uint256 private entropy;

  // Campaign structure
  struct Campaign {
    // Total number of issued card
    uint64 opened;
    // Soft cap of card distribution
    uint64 softCap;
    // Deadline of timestamp
    uint64 deadline;
    // Generation
    uint64 generation;
    // Start card Id
    uint64 start;
    // Start end card Id
    uint64 end;
    // Unique design
    uint64 designs;
    // Card distribution
    uint256[] distribution;
  }

  // Campaign storage
  mapping(uint256 => Campaign) private campaignStorage;

  // New campaign
  event NewCampaign(uint256 indexed campaginId, uint256 indexed generation, uint64 indexed designs);

  // New card
  event NewCard(uint256 indexed cardIndex, address indexed cardAddress, string indexed cardName);

  constructor(
    address _registry,
    bytes32 _domain,
    address divine
  ) {
    _init(_registry, _domain);
    theDivine = ITheDivine(divine);
  }

  // Create new campaign
  function newCampaign(Campaign memory campaign) external onlyAllowSameDomain('Oracle') returns (uint256) {
    require(
      (campaign.end - campaign.start) == campaign.designs,
      'Distributor: Number of deisgns and number of issued NFTs must be the same'
    );
    // Overwrite start with number of unique design
    // and then increase unique design to new card
    // To make sure card id won't be duplicated
    // Auto assign generation
    campaignIndex += 1;
    campaign.generation = uint64(campaignIndex / 25);
    campaignStorage[campaignIndex] = campaign;
    emit NewCampaign(campaignIndex, campaign.generation, campaign.designs);
    return campaignIndex;
  }

  // Compute random value from RNG
  function compute(bytes memory data)
    external
    override
    onlyAllowCrossDomain('DKDAO Infrastructure', 'RNG')
    returns (bool)
  {
    require(data.length == 32, 'Distributor: Data must be 32 in length');
    // We combine random value with The Divine's result to prevent manipulation
    // https://github.com/chiro-hiro/thedivine
    entropy ^= uint256(data.readUint256(0)) ^ theDivine.rand();
    return true;
  }

  // Calcualte card
  function caculateCard(Campaign memory currentCampaign, uint256 luckyNumber) private pure returns (uint256) {
    for (uint256 i = 0; i < currentCampaign.distribution.length; i += 1) {
      uint256 t = currentCampaign.distribution[i];
      uint256 mask = t & 0xffffffffffffffff;
      uint256 difficulty = (t >> 64) & 0xffffffffffffffff;
      uint256 factor = (t >> 128) & 0xffffffffffffffff;
      uint256 start = (t >> 192) & 0xffffffffffffffff;
      if ((luckyNumber & mask) < difficulty) {
        // Return card Id
        return currentCampaign.start + start + (luckyNumber % factor);
      }
    }
    return 0;
  }

  // Open loot boxes
  function openBox(
    uint256 campaignId,
    address buyer,
    uint256 numberOfBoxes
  ) external onlyAllowSameDomain('Oracle') returns (bool) {
    require(
      numberOfBoxes == 1 || numberOfBoxes == 5 || numberOfBoxes == 10,
      'Distributor: Invalid number of loot boxes'
    );
    require(campaignId > 0 && campaignId <= campaignIndex, 'Distributor: Invalid campaign Id');
    Campaign memory currentCampaign = campaignStorage[campaignId];
    currentCampaign.opened += uint64(numberOfBoxes);
    // Set deadline if softcap is reached
    if (currentCampaign.deadline > 0) {
      require(block.timestamp > currentCampaign.deadline, 'Distributor: Card sale is over');
    }
    if (currentCampaign.deadline == 0 && currentCampaign.opened > currentCampaign.softCap) {
      currentCampaign.deadline = uint64(block.timestamp + 3 days);
    }
    uint256 rand = entropy;
    uint256 boughtCards = numberOfBoxes * 5;
    uint256 luckyNumber;
    uint256 card;
    uint256 cardSerial = serial;
    for (uint256 i = 0; i < boughtCards; ) {
      // Repeat hash on its selft
      rand = uint256(keccak256(abi.encodePacked(rand)));
      for (uint256 j = 0; j < 256 && i < boughtCards; j += 32) {
        luckyNumber = (rand >> j) & 0xffffffff;
        // Draw card by lucky number
        card = caculateCard(currentCampaign, luckyNumber);
        if (card > 0) {
          cardSerial += 1;
          INFT(cardStorage[card]).mint(buyer, cardSerial);
          i += 1;
        }
      }
    }
    serial = cardSerial;
    campaignStorage[campaignId] = currentCampaign;
    // Update old random with new one
    entropy = rand;
    return true;
  }

  // Issue genesis edition for card creator
  function issueGenesisEdittion(uint256 cardId, address owner) public onlyAllowSameDomain('Oracle') returns (bool) {
    require(genesisEdition[cardStorage[cardId]] == 0, 'Distributor: Only one genesis edition will be distributed');
    genesisSerial += 1;
    uint256 genesisCardSerial = 0xffffffffffffffffffffffffffffffff00000000000000000000000000000000 | genesisSerial;
    genesisEdition[cardStorage[cardId]] = genesisCardSerial;
    INFT(cardStorage[cardId]).mint(owner, genesisCardSerial);
    return true;
  }

  // Open loot boxes
  function issueCard(string calldata name, string calldata symbol)
    external
    onlyAllowSameDomain('Oracle')
    returns (bool)
  {
    cardIndex += 1;
    address addrNFT = IPress(registry.getAddress('DKDAO Infrastructure', 'Press')).newNFT(domain, name, symbol);
    cardStorage[cardIndex] = addrNFT;
    emit NewCard(cardIndex, addrNFT, name);
    return true;
  }

  // Read campaign storage of a given campaign index
  function getCampaignIndex() external view returns (uint256) {
    return campaignIndex;
  }

  // Read campaign storage of a given campaign index
  function getCampaign(uint256 index) external view returns (Campaign memory) {
    return campaignStorage[index];
  }

  // Get card index
  function getCardIndex() external view returns (uint256) {
    return cardIndex;
  }

  // Read card storage of a given card index
  function getCard(uint256 index) external view returns (address) {
    return cardStorage[index];
  }
}
