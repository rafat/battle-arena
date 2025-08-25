// scripts/diagnose-randomness.js
const { createPublicClient, http, getContract } = require('viem');

// SEI testnet configuration
const seiTestnet = {
  id: 1328,
  name: 'SEI Testnet',
  network: 'sei-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    public: { http: ['https://evm-rpc-testnet.sei-apis.com'] },
    default: { http: ['https://evm-rpc-testnet.sei-apis.com'] },
  },
  blockExplorers: {
    default: { name: 'SeiTrace', url: 'https://seitrace.com' },
  },
};

const RANDOMNESS_PROVIDER_ABI = [
  {
    "inputs": [],
    "name": "getFee",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestRandomNumber",
    "outputs": [{ "internalType": "uint64", "name": "sequenceNumber", "type": "uint64" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint64", "name": "sequenceNumber", "type": "uint64" }],
    "name": "isRandomNumberReady",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function diagnoseRandomnessProvider() {
  const publicClient = createPublicClient({
    chain: seiTestnet,
    transport: http('https://evm-rpc-testnet.sei-apis.com'),
  });

  const randomnessProviderAddress = '0xD6fC9AaFcdAA4d251040319b19ca5Cd0E234a615';
  
  console.log('🔍 Diagnosing Randomness Provider at:', randomnessProviderAddress);
  console.log('='.repeat(60));

  try {
    // Check if contract exists
    console.log('1. Checking if contract exists...');
    const bytecode = await publicClient.getBytecode({
      address: randomnessProviderAddress,
    });
    
    if (!bytecode || bytecode === '0x') {
      console.log('❌ Contract does not exist at this address!');
      console.log('🔧 Solution: Deploy a MockRandomnessProvider contract');
      return false;
    }
    console.log('✅ Contract exists');

    // Check if we can call getFee
    console.log('\n2. Checking getFee function...');
    try {
      const fee = await publicClient.readContract({
        address: randomnessProviderAddress,
        abi: RANDOMNESS_PROVIDER_ABI,
        functionName: 'getFee',
      });
      console.log('✅ getFee() works, fee:', fee.toString(), 'wei');
    } catch (feeError) {
      console.log('❌ getFee() failed:', feeError.message);
      console.log('🔧 This indicates the contract is not implementing IRandomnessProvider properly');
      return false;
    }

    // Try to simulate requestRandomNumber (this might fail but gives us info)
    console.log('\n3. Simulating requestRandomNumber...');
    try {
      const result = await publicClient.simulateContract({
        address: randomnessProviderAddress,
        abi: RANDOMNESS_PROVIDER_ABI,
        functionName: 'requestRandomNumber',
        value: BigInt(1), // 1 wei
      });
      console.log('✅ requestRandomNumber simulation succeeded');
    } catch (simulateError) {
      console.log('❌ requestRandomNumber simulation failed:', simulateError.message);
      console.log('🔧 This is likely the source of the fight transaction failures');
      return false;
    }

    console.log('\n✅ Randomness provider appears to be working correctly');
    return true;

  } catch (error) {
    console.log('❌ General error:', error.message);
    return false;
  }
}

// Mock Randomness Provider contract code
const MOCK_RANDOMNESS_PROVIDER_CODE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IRandomnessProvider {
    function requestRandomNumber() external payable returns (uint64 sequenceNumber);
    function getRandomNumber(uint64 sequenceNumber) external view returns (bytes32);
    function isRandomNumberReady(uint64 sequenceNumber) external view returns (bool);
    function getFee() external view returns (uint256);
}

contract MockRandomnessProvider is IRandomnessProvider {
    bytes32 public fixedRandomValue;
    uint64 private sequenceCounter;
    mapping(uint64 => bytes32) public randomNumbers;
    mapping(uint64 => bool) public randomNumberReady;
    uint256 public constant MOCK_FEE = 1 wei;

    constructor(bytes32 _initialValue) {
        fixedRandomValue = _initialValue;
        sequenceCounter = 1;
    }

    function requestRandomNumber() external payable override returns (uint64 sequenceNumber) {
        require(msg.value >= MOCK_FEE, "Insufficient fee provided");
        
        sequenceNumber = sequenceCounter++;
        randomNumbers[sequenceNumber] = fixedRandomValue;
        randomNumberReady[sequenceNumber] = true;
        
        if (msg.value > MOCK_FEE) {
            payable(msg.sender).transfer(msg.value - MOCK_FEE);
        }
        
        return sequenceNumber;
    }

    function getRandomNumber(uint64 sequenceNumber) external view override returns (bytes32) {
        return randomNumbers[sequenceNumber];
    }

    function isRandomNumberReady(uint64 sequenceNumber) external view override returns (bool) {
        return randomNumberReady[sequenceNumber];
    }

    function getFee() external pure override returns (uint256) {
        return MOCK_FEE;
    }

    function setFixedRandomValue(bytes32 _newValue) external {
        fixedRandomValue = _newValue;
    }

    receive() external payable {}
    fallback() external payable {}
}
`;

async function main() {
  const isWorking = await diagnoseRandomnessProvider();
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSIS SUMMARY');
  console.log('='.repeat(60));
  
  if (!isWorking) {
    console.log('❌ Randomness provider is not working properly');
    console.log('\n🔧 RECOMMENDED SOLUTIONS:');
    console.log('1. Deploy a new MockRandomnessProvider contract');
    console.log('2. Update Arena contract to use the new provider');
    console.log('3. Update .env with new randomness provider address');
    console.log('\n📝 MockRandomnessProvider contract code saved above');
  } else {
    console.log('✅ Randomness provider appears to be working');
    console.log('🤔 The issue might be elsewhere - check transaction gas limits or network issues');
  }
}

main().catch(console.error);