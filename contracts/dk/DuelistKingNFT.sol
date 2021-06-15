// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import '../interfaces/IRNGConsumer.sol';
import '../libraries/User.sol';
import '../libraries/Bytes.sol';
import '../interfaces/ITheDivine.sol';
import './DuelistKingCard.sol';

/**
 * Card distributor
 * Name: Distributor
 * Domain: Duelist King
 */
contract DuelistKingNFT is User, ERC721('DKNFT', 'Duelist King NFT'), IRNGConsumer {
  // NFT by given domain
  using DuelistKingCard for uint256;

  // Using Bytes for bytes
  using Bytes for bytes;

  // Card id of unique design
  uint256 private assignedcard;

  // Number of seiral
  uint256 private serial;

  // Campaign index
  uint256 campaignIndex;

  // The Divine
  ITheDivine private immutable theDivine;

  uint256 entropy;

  // Caompaign structure
  struct Campaign {
    // Total number of issued card
    uint128 opened;
    // Soft cap of card distribution
    uint128 softCap;
    // Deadline of timestamp
    uint64 deadline;
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
  function compute(bytes memory data)
    external
    override
    onlyAllowCrossDomain(bytes32('DKDAO Infrastructure'), bytes32('RNG'))
    returns (bool)
  {
    require(data.length == 32, 'DKNFT: Data must be 32 in length');
    // We combine random value with The Divine's result to prevent manipulation
    // https://github.com/chiro-hiro/thedivine
    entropy ^= uint256(data.readUint256(0)) ^ theDivine.rand();
    return true;
  }

  // Calcualte card
  function caculateCard(Campaign memory currentCampaign, uint256 luckyNumber) private pure returns (uint256) {
    uint256 card;
    for (uint256 i = 0; i < currentCampaign.distribution.length; i += 1) {
      uint256 t = currentCampaign.distribution[i];
      uint256 mask = t & 0xffffffffffffffff;
      uint256 difficulty = (t >> 64) & 0xffffffffffffffff;
      uint256 rareness = (t >> 128) & 0xffffffff;
      uint256 factor = (t >> 160) & 0xffffffff;
      uint256 start = (t >> 192) & 0xffffffff;
      if ((luckyNumber & mask) < difficulty) {
        // Set type = 1 card
        card = card.setType(1);
        card = card.setId(currentCampaign.start + start + (luckyNumber % factor));
        card = card.setRareness(rareness);
        card = card.setGeneration(currentCampaign.generation);
        return card;
      }
    }
    return 0;
  }

  // Open loot boxes
  function openBox(
    uint256 campaignId,
    address buyer,
    uint256 numberOfBoxes
  ) external onlyAllowSameDomain(bytes32('Oracle')) returns (bool) {
    require(numberOfBoxes == 1 || numberOfBoxes == 5 || numberOfBoxes == 10, 'DKNFT: Invalid number of loot boxes');
    require(campaignId > 0 && campaignId <= campaignIndex, 'DKNFT: Invalid campaign Id');
    Campaign memory currentCampaign = campaignStorage[campaignId];
    currentCampaign.opened += uint128(numberOfBoxes);
    // Set deadline if softcap is reached
    if (currentCampaign.deadline > 0) {
      require(block.timestamp > currentCampaign.deadline, 'DKNFT: Card sale is over');
    }
    if (currentCampaign.deadline == 0 && currentCampaign.opened > currentCampaign.softCap) {
      currentCampaign.deadline = uint64(block.timestamp + 3 days);
    }
    uint256 rand = uint256(keccak256(abi.encodePacked(entropy)));
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
          card = card.setSerial(cardSerial);
          _mint(buyer, card);
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

  // Read campaign storage of a given campaign index
  function getCampaign(uint256 index) external view returns (Campaign memory) {
    return campaignStorage[index];
  }
}
