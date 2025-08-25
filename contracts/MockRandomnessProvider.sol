// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Interfaces.sol";

/**
 * @title MockRandomnessProvider
 * @dev Mock implementation of IRandomnessProvider for testing purposes
 * This contract simulates the behavior of PythEntropyRandomness without requiring
 * actual Pyth Entropy infrastructure, making tests deterministic and predictable.
 */
contract MockRandomnessProvider is IRandomnessProvider {
    // Public variable to hold the fixed random value that will be returned
    bytes32 public fixedRandomValue;
    
    // Counter for sequence numbers
    uint64 private sequenceCounter;
    
    // Mapping from sequence number to random number
    mapping(uint64 => bytes32) public randomNumbers;
    
    // Mapping from sequence number to readiness status
    mapping(uint64 => bool) public randomNumberReady;
    
    // Mock fee (1 wei for testing)
    uint256 public constant MOCK_FEE = 1 wei;

    /**
     * @dev Constructor to initialize the mock contract with an initial random value
     * @param _initialValue The initial fixed random value to be returned
     */
    constructor(bytes32 _initialValue) {
        fixedRandomValue = _initialValue;
        sequenceCounter = 1;
    }

    /**
     * @dev Mock implementation of requestRandomNumber
     * Immediately returns a sequence number and sets the random number as ready
     * @return sequenceNumber The sequence number that identifies this request
     */
    function requestRandomNumber() external payable override returns (uint64 sequenceNumber) {
        require(msg.value >= MOCK_FEE, "Insufficient fee provided");
        
        sequenceNumber = sequenceCounter++;
        
        // In the mock, we immediately make the random number available
        randomNumbers[sequenceNumber] = fixedRandomValue;
        randomNumberReady[sequenceNumber] = true;
        
        // Refund excess payment
        if (msg.value > MOCK_FEE) {
            payable(msg.sender).transfer(msg.value - MOCK_FEE);
        }
        
        return sequenceNumber;
    }

    /**
     * @dev Get the random number for a given sequence number
     * @param sequenceNumber The sequence number of the request
     * @return The generated random number
     */
    function getRandomNumber(uint64 sequenceNumber) external view override returns (bytes32) {
        return randomNumbers[sequenceNumber];
    }

    /**
     * @dev Check if a random number is ready for a given sequence number
     * @param sequenceNumber The sequence number to check
     * @return True if the random number is ready
     */
    function isRandomNumberReady(uint64 sequenceNumber) external view override returns (bool) {
        return randomNumberReady[sequenceNumber];
    }

    /**
     * @dev Get the fee required for requesting a random number
     * @return The mock fee amount in wei
     */
    function getFee() external pure override returns (uint256) {
        return MOCK_FEE;
    }

    /**
     * @dev Allows setting a new fixed random value for testing different scenarios
     * @param _newValue The new fixed random value to set
     */
    function setFixedRandomValue(bytes32 _newValue) external {
        fixedRandomValue = _newValue;
    }

    /**
     * @dev Function to receive Ether
     */
    receive() external payable {}

    /**
     * @dev Fallback function to receive Ether
     */
    fallback() external payable {}
}