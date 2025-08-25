// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Interface for Pyth Entropy Randomness
interface IRandomnessProvider {
    function requestRandomNumber() external payable returns (uint64 sequenceNumber);
    function getRandomNumber(uint64 sequenceNumber) external view returns (bytes32);
    function isRandomNumberReady(uint64 sequenceNumber) external view returns (bool);
    function getFee() external view returns (uint256);
}

// Enum and Struct for new Battle Tactics
enum Strategy { Balanced, Berserker, Tactician, Defensive }

struct BattleTactics {
    uint8 aggressiveness; // 0-100: How aggressive the agent fights
    Strategy strategy;   // Battle strategy choice
    uint8 riskTolerance; // 0-100: Willingness to take risks
}


// Interface for your AgentFactory
interface IAgentFactory {
    struct DNA {
        uint256 strength;
        uint256 agility;
        uint256 intelligence;
        uint8 elementalAffinity; // 0:Neutral, 1:Fire, 2:Water, 3:Earth, 4:Air
    }

    struct Agent {
        uint256 id;
        uint256 level;
        uint256 experience;
        DNA dna;
        string metadataCID;
        uint256 equippedItem;
    }

    function getAgent(uint256 tokenId) external view returns (Agent memory);
    function gainExperience(uint256 tokenId, uint256 xp) external;
}

// Interface for your ItemFactory
interface IItemFactory {
    function mint(address to, uint8 itemType, uint256 power) external returns (uint256);
}