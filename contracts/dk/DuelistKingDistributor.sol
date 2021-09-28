// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.8.4 <0.9.0;
pragma abicoder v2;

import './DuelistKingItem.sol';
import '../interfaces/IRNGConsumer.sol';
import '../libraries/User.sol';
import '../libraries/Bytes.sol';
import '../interfaces/ITheDivine.sol';
import '../interfaces/INFT.sol';
import '../interfaces/IPress.sol';

/**
 * Card distributor
 * Name: Distributor
 * Domain: Duelist King
 */
contract DuelistKingDistributor is User, IRNGConsumer {
  // Using Bytes for bytes
  using Bytes for bytes;

  // Using Duelist King Card for uint256
  using DuelistKingItem for uint256;

  // Number of seiral
  uint256 private serial;

  // Campaign index
  uint256 campaignIndex;

  // The Divine
  ITheDivine private immutable theDivine;

  // Maping genesis
  mapping(uint256 => uint256) genesisEdition;

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
    // Card distribution
    uint256[] distribution;
  }

  // Campaign storage
  mapping(uint256 => Campaign) private campaignStorage;

  // New campaign
  event NewCampaign(uint256 indexed campaginId, uint256 indexed generation, uint64 indexed softcap);

  constructor(
    address _registry,
    bytes32 _domain,
    address divine
  ) {
    _registryUserInit(_registry, _domain);
    theDivine = ITheDivine(divine);
  }

  // Create new campaign
  function newCampaign(Campaign memory campaign) external onlyAllowSameDomain('Oracle') returns (uint256) {
    // Overwrite start with number of unique design
    // and then increase unique design to new card
    // To make sure card id won't be duplicated
    // Auto assign generation
    campaignIndex += 1;
    campaignStorage[campaignIndex] = campaign;
    emit NewCampaign(campaignIndex, campaign.generation, campaign.softCap);
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
    uint256 luckyDraw = luckyNumber % (currentCampaign.softCap * 5);
    for (uint256 i = 0; i < currentCampaign.distribution.length; i += 1) {
      uint256 t = currentCampaign.distribution[i];
      uint256 rEnd = t & 0xffffffff;
      uint256 rStart = (t >> 32) & 0xffffffff;
      uint256 rareness = (t >> 64) & 0xffffffff;
      uint256 cardStart = (t >> 96) & 0xffffffff;
      uint256 cardFactor = (t >> 128) & 0xffffffff;
      if (luckyDraw >= rStart && luckyDraw <= rEnd) {
        // Return card Id
        return uint256(0).setRareness(rareness).setId(currentCampaign.start + cardStart + (luckyNumber % cardFactor));
      }
    }
    return 0;
  }

  // Open loot boxes
  function openBox(
    uint256 campaignId,
    address owner,
    uint256 numberOfBoxes
  ) external onlyAllowSameDomain('Oracle') returns (bool) {
    require(numberOfBoxes <= 10, 'Distributor: Invalid number of loot boxes');
    IPress infrastructurePress = IPress(registry.getAddress('DKDAO Infrastructure', 'Press'));
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
    uint256 rand = uint256(keccak256(abi.encodePacked(entropy, owner)));
    uint256 boughtCards = numberOfBoxes * 5;
    uint256 luckyNumber;
    uint256 card = uint256(0).setGeneration(currentCampaign.generation);
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
          infrastructurePress.createItem(domain, owner, card.setSerial(cardSerial));
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
  function issueGenesisEdittion(address owner, uint256 id) public onlyAllowSameDomain('Oracle') returns (bool) {
    // This card is genesis edittion
    uint256 card = uint256(0x0000000000000000ffff00000000000000000000000000000000000000000000).setId(id);
    require(genesisEdition[card] == 0, 'Distributor: Only one genesis edition will be distributed');
    serial += 1;
    uint256 issueCard = card.setSerial(serial);
    genesisEdition[card] = issueCard;
    IPress(registry.getAddress('DKDAO Infrastructure', 'Press')).createItem(domain, owner, issueCard);
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
}
