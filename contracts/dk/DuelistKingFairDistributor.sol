// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '../interfaces/IRNGConsumer.sol';
import '../interfaces/IPress.sol';
import '../libraries/User.sol';
import '../libraries/Bytes.sol';
import '../interfaces/ITheDivine.sol';
import './DuelistKingCard.sol';

/**
 * Card distributor
 * Name: Distributor
 * Domain: Duelist King
 */
contract DuelistKingFairDistributor is User, IRNGConsumer {
  // NFT by given domain
  using DuelistKingCard for uint256;

  using Bytes for bytes;

  // Card id of unique design
  uint256 private assignedcard;

  // Campaign index
  uint256 campaignIndex;

  // The Divine
  ITheDivine private immutable theDivine;

  // Caompaign structure
  struct Campaign {
    // Generation
    uint64 generation;
    // Start card Id
    uint64 start;
    // Unique design
    uint64 designs;
    // Card distribution
    uint256[] distribution;
  }

  // Campaign storage
  mapping(uint256 => Campaign) private campaignStorage;

  // New campaign
  event NewCampaign(uint256 indexed campaginId, uint256 indexed generation, uint64 indexed designs);
  // Found a card
  event BuyOrder(uint256 indexed campaginId, address indexed buyer, uint256 numberOfBoxes, uint256 indexed randomValue);

  constructor(
    address _registry,
    bytes32 _domain,
    address divine
  ) {
    init(_registry, _domain);
    theDivine = ITheDivine(divine);
  }

  // Create new campaign
  function newCampaign(Campaign memory campaign) external onlyAllowSameDomain(bytes32('Oracle')) returns (uint256) {
    // Overwrite start with number of unique design
    // and then increase unique design to new card
    // To make sure card id won't be duplicated
    campaign.start = uint64(assignedcard);
    assignedcard += campaign.designs;
    // Auto assign generation
    campaignIndex += 1;
    campaign.generation = uint64(campaignIndex / 25);
    campaignStorage[campaignIndex] = campaign;
    emit NewCampaign(campaignIndex, campaign.generation, campaign.designs);
    return campaignIndex;
  }

  // Compute random value from RNG
  function compute(uint256 secret, bytes memory data)
    external
    override
    onlyAllowCrossDomain(bytes32('DKDAO Infrastructure'), bytes32('RNG'))
    returns (bool)
  {
    require(data.length == 52, 'FairDistributor: Wrong data length');
    // We combine random value with The Divine's result to prevent manipulation
    // https://github.com/chiro-hiro/thedivine
    uint256 randomValue = uint256(secret) ^ theDivine.rand();
    address buyer = data.readAddress(0);
    uint256 noOfBoxes = data.readUint256(20);
    emit BuyOrder(campaignIndex, buyer, noOfBoxes, randomValue);
    return true;
  }

  // Calcualte card
  function caculateCard(Campaign memory currentCampaign, uint256 luckyNumber) private pure returns (uint256, uint256) {
    uint256 card;
    for (uint256 i = 0; i < currentCampaign.distribution.length; i += 1) {
      uint256 t = currentCampaign.distribution[i];
      uint256 mask = t & 0xffffffffffffffff;
      uint256 difficulty = (t >> 64) & 0xffffffffffffffff;
      uint256 rareness = (t >> 128) & 0xffffffff;
      uint256 factor = (t >> 160) & 0xffffffff;
      uint256 start = (t >> 192) & 0xffffffff;
      if ((luckyNumber & mask) < difficulty) {
        // Calculate card
        card = card.setId(currentCampaign.start + start + (luckyNumber % factor));
        card = card.setRareness(rareness);
        card = card.setGeneration(currentCampaign.generation);
        return (i, card);
      }
    }
    return (0, 0);
  }

  // Open loot boxes
  function openBox(
    uint256 campaignId,
    address buyer,
    uint256 numberOfBoxes,
    uint256 randomValue
  ) external view returns (uint256[] memory) {
    Campaign memory currentCampaign = campaignStorage[campaignId];
    // Different buyer will have different result
    uint256 rand = uint256(keccak256(abi.encodePacked(randomValue, buyer)));
    uint256 boughtCards = numberOfBoxes * 5;
    uint256 luckyNumber;
    uint256[] memory cards = new uint256[](boughtCards);
    uint256 card;
    uint256 cardIndex;
    for (uint256 i = 0; i < boughtCards; ) {
      // Repeat hash on its selft
      rand = uint256(keccak256(abi.encodePacked(rand)));
      for (uint256 j = 0; j < 256 && i < boughtCards; j += 32) {
        luckyNumber = (rand >> j) & 0xffffffff;
        // Draw card by lucky number
        (cardIndex, card) = caculateCard(currentCampaign, luckyNumber);
        if (card > 0) {
          cards[i] = card;
          i += 1;
        }
      }
    }
    return cards;
  }

  // Read campaign storage of given campaign index
  function getCampaign(uint256 index) external view returns (Campaign memory) {
    return campaignStorage[index];
  }

  function constructData(
    bytes32 secret,
    address target,
    address buyer,
    uint256 numberOfBoxes
  ) external pure returns(bytes memory) {
    return abi.encodePacked(secret, target, buyer, numberOfBoxes);
  }
}
