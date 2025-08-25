// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "./Interfaces.sol";

/**
 * @title PythEntropyRandomness
 * @dev Contract that integrates with Pyth Entropy to provide secure on-chain randomness
 * This contract implements the IRandomnessProvider interface and serves as a bridge
 * between the battle arena contracts and Pyth Entropy.
 */
contract PythEntropyRandomness is IEntropyConsumer, IRandomnessProvider {
    IEntropyV2 public entropy;
    address public owner;
    
    // Mapping from sequence number to the generated random number
    mapping(uint64 => bytes32) public randomNumbers;
    
    // Mapping from sequence number to readiness status
    mapping(uint64 => bool) public randomNumberReady;
    
    // Events
    event RandomNumberRequested(uint64 indexed sequenceNumber, address indexed requester);
    event RandomNumberGenerated(uint64 indexed sequenceNumber, bytes32 randomNumber);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    /**
     * @dev Constructor to initialize the contract with Pyth Entropy address
     * @param entropyAddress The address of the Pyth Entropy contract on SEI testnet
     */
    constructor(address entropyAddress) {
        entropy = IEntropyV2(entropyAddress);
        owner = msg.sender;
    }

    /**
     * @dev Request a random number from Pyth Entropy
     * @return sequenceNumber The sequence number that identifies this request
     */
    function requestRandomNumber() external payable override returns (uint64 sequenceNumber) {
        uint256 fee = entropy.getFeeV2();
        require(msg.value >= fee, "Insufficient fee provided");
        
        sequenceNumber = entropy.requestV2{ value: fee }();
        
        emit RandomNumberRequested(sequenceNumber, msg.sender);
        
        // Refund excess payment
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        return sequenceNumber;
    }

    /**
     * @dev Get the random number for a given sequence number
     * @param sequenceNumber The sequence number of the request
     * @return The generated random number (returns 0 if not ready)
     */
    function getRandomNumber(uint64 sequenceNumber) external view override returns (bytes32) {
        return randomNumbers[sequenceNumber];
    }

    /**
     * @dev Check if a random number is ready for a given sequence number
     * @param sequenceNumber The sequence number to check
     * @return True if the random number is ready, false otherwise
     */
    function isRandomNumberReady(uint64 sequenceNumber) external view override returns (bool) {
        return randomNumberReady[sequenceNumber];
    }

    /**
     * @dev Get the fee required for requesting a random number
     * @return The fee amount in wei
     */
    function getFee() external view override returns (uint256) {
        return entropy.getFeeV2();
    }

    /**
     * @dev Callback function called by Pyth Entropy when random number is ready
     * @param sequenceNumber The sequence number of the request
     * @param provider The address of the provider (unused in our case)
     * @param randomNumber The generated random number
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) internal override {
        // Store the random number and mark as ready
        randomNumbers[sequenceNumber] = randomNumber;
        randomNumberReady[sequenceNumber] = true;
        
        emit RandomNumberGenerated(sequenceNumber, randomNumber);
    }

    /**
     * @dev Returns the address of the entropy contract
     * Required by IEntropyConsumer interface
     */
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    /**
     * @dev Emergency function to withdraw contract balance (owner only)
     */
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
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