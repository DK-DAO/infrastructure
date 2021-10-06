// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import './DuelistKingItem.sol';
import '../interfaces/IRNGConsumer.sol';
import '../libraries/User.sol';
import '../libraries/Bytes.sol';
import '../interfaces/ITheDivine.sol';
import '../interfaces/INFT.sol';

/**
 * Card distributor
 * Name: Distributor
 * Domain: Duelist King
 */
contract DuelistKingDistributor is User, IRNGConsumer {
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
    _registryUserInit(registry_, domain_);
    _theDivine = ITheDivine(divine);
  }

  // Adding entropy to the pool
  function compute(bytes memory data) external override onlyAllowCrossDomain('DKDAO', 'RNG') returns (bool) {
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
