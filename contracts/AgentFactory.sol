// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Interfaces.sol";

contract AgentFactory is IAgentFactory {
    // Randomness provider for generating random stats
    address public randomnessProvider;

    mapping(uint256 => Agent) public agents;
    uint256 public tokenIdCounter;
    
    // Mapping to track pending agent mints
    mapping(uint64 => uint256) public pendingMints; // sequenceNumber => tokenId
    mapping(uint64 => string) public pendingMetadata; // sequenceNumber => metadataCID
    
    // Mapping to track pending level ups
    mapping(uint64 => uint256) public pendingLevelUps; // sequenceNumber => tokenId

    // A simple XP curve for leveling up. level^3 * 100
    // Level 1 -> 2: 100 XP, Level 2 -> 3: 800 XP, etc.
    mapping(uint256 => uint256) public xpToLevelUp;

    address public arenaContract;
    address public owner;

    event AgentMinted(uint256 indexed tokenId, DNA dna, string metadataCID);
    event LeveledUp(uint256 indexed tokenId, uint256 newLevel, DNA newDna);
    event ExperienceGained(uint256 indexed tokenId, uint256 xpGained, uint256 totalExperience);
    event ItemEquipped(uint256 indexed agentId, uint256 indexed itemId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyArenaContract() {
        require(msg.sender == arenaContract, "Only Arena can call this");
        _;
    }
    // Initialize with randomness provider address
    constructor(address _randomnessProvider) {
        owner = msg.sender;
        tokenIdCounter = 0;
        randomnessProvider = _randomnessProvider;
        
        // Pre-calculate XP requirements for the first few levels
        for (uint256 i = 1; i < 20; i++) {
            xpToLevelUp[i] = i * i * i * 100;
        }
    }

    function setArenaContract(address _arenaAddress) public onlyOwner {
        arenaContract = _arenaAddress;
    }

    function setRandomnessProvider(address _randomnessProvider) public onlyOwner {
        randomnessProvider = _randomnessProvider;
    }

    function requestAgentMint(string memory _metadataCID) public payable returns (uint256 tokenId) {
        tokenIdCounter++;
        tokenId = tokenIdCounter;
        
        // Get the required fee and request randomness
        IRandomnessProvider provider = IRandomnessProvider(randomnessProvider);
        uint256 fee = provider.getFee();
        require(msg.value >= fee, "Insufficient fee for randomness");
        
        uint64 sequenceNumber = provider.requestRandomNumber{value: fee}();
        
        // Store the pending mint information
        pendingMints[sequenceNumber] = tokenId;
        pendingMetadata[sequenceNumber] = _metadataCID;
        
        // Refund excess payment
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        return tokenId;
    }
    
    function completeMint(uint64 sequenceNumber) public {
        require(pendingMints[sequenceNumber] != 0, "No pending mint for this sequence");
        
        IRandomnessProvider provider = IRandomnessProvider(randomnessProvider);
        require(provider.isRandomNumberReady(sequenceNumber), "Random number not ready yet");
        
        uint256 tokenId = pendingMints[sequenceNumber];
        string memory metadataCID = pendingMetadata[sequenceNumber];
        
        bytes32 randomValue = provider.getRandomNumber(sequenceNumber);
        bytes32 hashedRandom = keccak256(abi.encodePacked(randomValue, block.timestamp, tokenId));

        // Generate DNA from the random hash
        DNA memory newDna = DNA({
            strength: (uint256(uint40(bytes5(hashedRandom))) % 50) + 25, // Stat between 25-74
            agility: (uint256(uint40(bytes5(hashedRandom << 40))) % 50) + 25, // Stat between 25-74
            intelligence: (uint256(uint40(bytes5(hashedRandom << 80))) % 50) + 25, // Stat between 25-74
            elementalAffinity: uint8(uint256(uint8(bytes1(hashedRandom << 120))) % 5) // 0-4
        });

        agents[tokenId] = Agent({
            id: tokenId,
            level: 1,
            experience: 0,
            dna: newDna,
            metadataCID: metadataCID,
            equippedItem: 0
        });
        
        // Clean up pending mint data
        delete pendingMints[sequenceNumber];
        delete pendingMetadata[sequenceNumber];

        emit AgentMinted(tokenId, newDna, metadataCID);
    }
    
    // Convenience function for testing/mocking - can mint immediately if randomness is ready
    function mintAgent(string memory _metadataCID) public payable {
        tokenIdCounter++;
        uint256 tokenId = tokenIdCounter;
        
        // Get the required fee and request randomness
        IRandomnessProvider provider = IRandomnessProvider(randomnessProvider);
        uint256 fee = provider.getFee();
        require(msg.value >= fee, "Insufficient fee for randomness");
        
        uint64 sequenceNumber = provider.requestRandomNumber{value: fee}();
        
        // Store the pending mint information
        pendingMints[sequenceNumber] = tokenId;
        pendingMetadata[sequenceNumber] = _metadataCID;
        
        // Refund excess payment
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        // For the mock provider, randomness is available immediately
        // For real Pyth Entropy, this would need to be called later
        if (provider.isRandomNumberReady(sequenceNumber)) {
            completeMint(sequenceNumber);
        }
    }

    function requestLevelUp(uint256 _tokenId) public payable returns (uint64 sequenceNumber) {
        Agent storage agent = agents[_tokenId];
        require(agent.id != 0, "Agent does not exist");
        require(agent.experience >= xpToLevelUp[agent.level], "Not enough experience");
        
        // Get the required fee and request randomness
        IRandomnessProvider provider = IRandomnessProvider(randomnessProvider);
        uint256 fee = provider.getFee();
        require(msg.value >= fee, "Insufficient fee for randomness");
        
        sequenceNumber = provider.requestRandomNumber{value: fee}();
        
        // Store the pending level up information
        pendingLevelUps[sequenceNumber] = _tokenId;
        
        // Refund excess payment
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        return sequenceNumber;
    }
    
    function completeLevelUp(uint64 sequenceNumber) public {
        require(pendingLevelUps[sequenceNumber] != 0, "No pending level up for this sequence");
        
        IRandomnessProvider provider = IRandomnessProvider(randomnessProvider);
        require(provider.isRandomNumberReady(sequenceNumber), "Random number not ready yet");
        
        uint256 tokenId = pendingLevelUps[sequenceNumber];
        Agent storage agent = agents[tokenId];
        
        agent.level++;

        // VRF-powered stat gains
        bytes32 randomValue = provider.getRandomNumber(sequenceNumber);
        bytes32 hashedRandom = keccak256(abi.encodePacked(randomValue, agent.id));

        // Each stat has a 50% chance to get a larger boost
        agent.dna.strength += 2 + (uint256(uint8(bytes1(hashedRandom))) % 2) * 2; // +2 or +4
        agent.dna.agility += 2 + (uint256(uint8(bytes1(hashedRandom << 8))) % 2) * 2; // +2 or +4
        agent.dna.intelligence += 2 + (uint256(uint8(bytes1(hashedRandom << 16))) % 2) * 2; // +2 or +4
        
        // Clean up pending level up data
        delete pendingLevelUps[sequenceNumber];

        emit LeveledUp(tokenId, agent.level, agent.dna);
    }
    
    // Convenience function for testing/mocking - can level up immediately if randomness is ready
    function levelUp(uint256 _tokenId) public payable {
        Agent storage agent = agents[_tokenId];
        require(agent.id != 0, "Agent does not exist");
        require(agent.experience >= xpToLevelUp[agent.level], "Not enough experience");
        
        // Get the required fee and request randomness
        IRandomnessProvider provider = IRandomnessProvider(randomnessProvider);
        uint256 fee = provider.getFee();
        require(msg.value >= fee, "Insufficient fee for randomness");
        
        uint64 sequenceNumber = provider.requestRandomNumber{value: fee}();
        
        // Store the pending level up information
        pendingLevelUps[sequenceNumber] = _tokenId;
        
        // Refund excess payment
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        // For the mock provider, randomness is available immediately
        // For real Pyth Entropy, this would need to be called later
        if (provider.isRandomNumberReady(sequenceNumber)) {
            completeLevelUp(sequenceNumber);
        }
    }

    function gainExperience(uint256 _tokenId, uint256 _xp) public override onlyArenaContract {
        Agent storage agent = agents[_tokenId];
        require(agent.id != 0, "Agent does not exist");
        agent.experience += _xp;
        emit ExperienceGained(_tokenId, _xp, agent.experience);
    }

    function equipItem(uint256 _agentId, uint256 _itemId) public {
        // In a real scenario, you'd verify ownership of both agent and item
        agents[_agentId].equippedItem = _itemId;
        emit ItemEquipped(_agentId, _itemId);
    }

    function getAgent(uint256 _tokenId) public view override returns (Agent memory) {
        return agents[_tokenId];
    }
}