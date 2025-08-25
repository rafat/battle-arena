// scripts/check-arena-config.js
const { createPublicClient, http } = require('viem');

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

// Contract addresses from deployment
const AGENT_FACTORY_ADDRESS = '0xB2a78D06DcADE6d089aB718340ed29D56615D26e';
const ARENA_ADDRESS = '0x0EBD98777DBFa19E38DBe8B2557e214F99Df90DB';
const RANDOMNESS_PROVIDER_ADDRESS = '0xD6fC9AaFcdAA4d251040319b19ca5Cd0E234a615';

// AgentFactory ABI - minimal interface for checking configuration
const AGENT_FACTORY_ABI = [
  {
    "inputs": [],
    "name": "arenaContract",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "randomnessProvider",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Arena ABI - minimal interface for checking configuration
const ARENA_ABI = [
  {
    "inputs": [],
    "name": "agentFactory",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "randomnessProvider",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function checkContractConfiguration() {
  const publicClient = createPublicClient({
    chain: seiTestnet,
    transport: http('https://evm-rpc-testnet.sei-apis.com'),
  });

  console.log('🔍 Checking Contract Configuration...');
  console.log('='.repeat(60));
  
  try {
    // Check AgentFactory configuration
    console.log('\n📋 AgentFactory Configuration:');
    console.log('Address:', AGENT_FACTORY_ADDRESS);
    
    const agentFactoryArenaContract = await publicClient.readContract({
      address: AGENT_FACTORY_ADDRESS,
      abi: AGENT_FACTORY_ABI,
      functionName: 'arenaContract',
    });
    
    const agentFactoryRandomnessProvider = await publicClient.readContract({
      address: AGENT_FACTORY_ADDRESS,
      abi: AGENT_FACTORY_ABI,
      functionName: 'randomnessProvider',
    });
    
    const agentFactoryOwner = await publicClient.readContract({
      address: AGENT_FACTORY_ADDRESS,
      abi: AGENT_FACTORY_ABI,
      functionName: 'owner',
    });

    console.log('├─ Arena Contract:', agentFactoryArenaContract);
    console.log('├─ Randomness Provider:', agentFactoryRandomnessProvider);
    console.log('└─ Owner:', agentFactoryOwner);

    // Check Arena configuration
    console.log('\n🏟️ Arena Configuration:');
    console.log('Address:', ARENA_ADDRESS);
    
    const arenaAgentFactory = await publicClient.readContract({
      address: ARENA_ADDRESS,
      abi: ARENA_ABI,
      functionName: 'agentFactory',
    });
    
    const arenaRandomnessProvider = await publicClient.readContract({
      address: ARENA_ADDRESS,
      abi: ARENA_ABI,
      functionName: 'randomnessProvider',
    });

    console.log('├─ Agent Factory:', arenaAgentFactory);
    console.log('└─ Randomness Provider:', arenaRandomnessProvider);

    // Configuration validation
    console.log('\n✅ Configuration Validation:');
    console.log('='.repeat(40));
    
    const isArenaRecognizedByAgentFactory = agentFactoryArenaContract.toLowerCase() === ARENA_ADDRESS.toLowerCase();
    const isAgentFactoryRecognizedByArena = arenaAgentFactory.toLowerCase() === AGENT_FACTORY_ADDRESS.toLowerCase();
    const randomnessProviderMatch = agentFactoryRandomnessProvider.toLowerCase() === arenaRandomnessProvider.toLowerCase();
    
    console.log('🤝 Arena recognized by AgentFactory:', isArenaRecognizedByAgentFactory ? '✅ YES' : '❌ NO');
    console.log('   Expected:', ARENA_ADDRESS);
    console.log('   Actual:  ', agentFactoryArenaContract);
    
    console.log('\n🤝 AgentFactory recognized by Arena:', isAgentFactoryRecognizedByArena ? '✅ YES' : '❌ NO');
    console.log('   Expected:', AGENT_FACTORY_ADDRESS);
    console.log('   Actual:  ', arenaAgentFactory);
    
    console.log('\n🎲 Randomness Provider consistency:', randomnessProviderMatch ? '✅ YES' : '❌ NO');
    console.log('   AgentFactory uses:', agentFactoryRandomnessProvider);
    console.log('   Arena uses:      ', arenaRandomnessProvider);
    console.log('   Expected:        ', RANDOMNESS_PROVIDER_ADDRESS);

    // Overall status
    console.log('\n📊 OVERALL STATUS:');
    console.log('='.repeat(40));
    
    if (isArenaRecognizedByAgentFactory && isAgentFactoryRecognizedByArena && randomnessProviderMatch) {
      console.log('🎉 ALL CONFIGURATIONS ARE CORRECT!');
      console.log('✅ Fight transactions should work properly.');
    } else {
      console.log('⚠️ CONFIGURATION ISSUES DETECTED!');
      
      if (!isArenaRecognizedByAgentFactory) {
        console.log('❌ AgentFactory does not recognize Arena contract');
        console.log('   This will cause gainExperience() calls to fail during fights');
        console.log('   Fix: Call agentFactory.setArenaContract(' + ARENA_ADDRESS + ')');
      }
      
      if (!isAgentFactoryRecognizedByArena) {
        console.log('❌ Arena does not recognize AgentFactory contract');
        console.log('   This will cause agent data fetching to fail');
      }
      
      if (!randomnessProviderMatch) {
        console.log('❌ Randomness provider mismatch between contracts');
        console.log('   This can cause inconsistent behavior');
      }
    }

  } catch (error) {
    console.error('❌ Error checking configuration:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('   - Contract addresses might be incorrect');
    console.log('   - Contracts might not be deployed properly');
    console.log('   - RPC connection issues');
  }
}

// Run the check
checkContractConfiguration()
  .then(() => {
    console.log('\n🏁 Configuration check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });