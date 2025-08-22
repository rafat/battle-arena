// lib/ai/strategy.ts (fixed)
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import { BattleTactics, Strategy } from "@/lib/types/contracts";

const tools: any[] = [];

export class AIStrategyEngine {
  private llm: ChatOpenAI;
  private agentExecutor!: AgentExecutor;

  constructor() {
    this.llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.3, // Reduced temperature for more consistent responses
    });
  }

  public static async create(): Promise<AIStrategyEngine> {
    const engine = new AIStrategyEngine();

    const prompt = await pull<ChatPromptTemplate>("hwchase17/openai-functions-agent");

    const agent = await createOpenAIFunctionsAgent({
      llm: engine.llm,
      tools,
      prompt,
    });

    engine.agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
    });

    return engine;
  }

  async generateBattleTactics(
    agentData: any,
    opponentData: any,
    battleHistory: any[],
    arenaType?: number
  ): Promise<BattleTactics> {
    const arenaNames = ['Neutral Fields', 'Volcanic Plains', 'Mystic Forest'];
    const arenaName = arenaNames[arenaType || 0];

    const winRate = this.calculateWinRate(agentData.id, battleHistory);
    const recentPerformance = this.analyzeRecentPerformance(agentData.id, battleHistory);

    const prompt = `
    You are an AI battle strategist for agent "${agentData.nickname || `Agent ${agentData.agent_id}`}". 
    
    CURRENT BATTLE CONTEXT:
    Arena: ${arenaName}
    ${arenaType === 1 ? '(+15% fire damage bonus)' : ''}
    ${arenaType === 2 ? '(+15% earth/air damage bonus)' : ''}
    
    YOUR AGENT STATS:
    - Level: ${agentData.level}
    - Strength: ${agentData.dna.strength}
    - Agility: ${agentData.dna.agility}
    - Intelligence: ${agentData.dna.intelligence}
    - Elemental Affinity: ${agentData.dna.elementalAffinity} (0=None, 1=Fire, 2=Water, 3=Earth, 4=Air)
    - Overall Win Rate: ${winRate}%
    - Recent Performance: ${recentPerformance}
    
    OPPONENT STATS:
    - Level: ${opponentData.level}
    - Strength: ${opponentData.dna.strength}
    - Agility: ${opponentData.dna.agility}
    - Intelligence: ${opponentData.dna.intelligence}
    - Elemental Affinity: ${opponentData.dna.elementalAffinity}
    
    BATTLE MECHANICS:
    - Attack Power = Strength * 2 + Intelligence
    - Defense Power = Strength + Intelligence * 2
    - Evasion based on Agility (max 50% chance)
    - Aggressiveness: +25% attack, -25% defense (at 100)
    - Risk Tolerance: Higher = more crits/fumbles
    
    STRATEGY EFFECTS:
    - Berserker: +30% attack power
    - Tactician: +15% attack AND defense
    - Defensive: +30% defense power
    - Balanced: No bonuses but no penalties
    
    RECENT BATTLES: ${JSON.stringify(battleHistory.slice(-3), null, 2)}
    
    IMPORTANT: You must respond with ONLY a valid JSON object in this exact format:
    Based on this analysis, return optimal tactics as a JSON object:
    {
      "aggressiveness": 0-100,
      "strategy": "Balanced|Berserker|Tactician|Defensive",
      "riskTolerance": 0-100,
      "reasoning": "detailed explanation of tactical choices"
    }
    
    Valid strategy values are: "Balanced", "Berserker", "Tactician", "Defensive"
    aggressiveness and riskTolerance values must be between 0 and 100.
    `;

    try {
      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      console.log("LLM Response: ",content);
      
      // More robust JSON extraction
      let tactics;
      try {
        // Try to parse the entire response as JSON first
        tactics = JSON.parse(content.trim());
      } catch {
        // If that fails, extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
          throw new Error('No valid JSON found in response');
        }
        tactics = JSON.parse(jsonMatch[0]);
      }
      
      // Validate the response structure
      if (!tactics || typeof tactics !== 'object') {
        throw new Error('Invalid tactics object structure');
      }
      
      // Ensure all required fields are present and valid
      const validatedTactics = {
        aggressiveness: this.validateNumber(tactics.aggressiveness, 50, 0, 100),
        strategy: this.parseStrategy(tactics.strategy),
        riskTolerance: this.validateNumber(tactics.riskTolerance, 50, 0, 100),
      };
      
      console.log("Generated tactics:", validatedTactics);
      console.log("Reasoning:", tactics.reasoning);
      
      return validatedTactics;
    } catch (error) {
      console.error('AI tactics generation failed:', error);
      
      // Fallback: Generate tactics based on agent stats
      return this.generateFallbackTactics(agentData, opponentData, arenaType);
    }
  }

  private validateNumber(value: any, defaultValue: number, min: number, max: number): number {
    const num = typeof value === 'number' ? value : parseInt(value);
    if (isNaN(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
  }

  private calculateWinRate(agentId: number, battleHistory: any[]): number {
    const agentBattles = battleHistory.filter(b => 
      b.agent1_id === agentId || b.agent2_id === agentId
    );
    
    if (agentBattles.length === 0) return 0;
    
    const wins = agentBattles.filter(b => b.winner_id === agentId).length;
    return Math.round((wins / agentBattles.length) * 100);
  }

  private analyzeRecentPerformance(agentId: number, battleHistory: any[]): string {
    const recentBattles = battleHistory
      .filter(b => b.agent1_id === agentId || b.agent2_id === agentId)
      .slice(0, 3);
    
    if (recentBattles.length === 0) return 'No recent battles';
    
    const recentWins = recentBattles.filter(b => b.winner_id === agentId).length;
    const winRate = (recentWins / recentBattles.length) * 100;
    
    if (winRate >= 67) return 'On a winning streak';
    if (winRate >= 33) return 'Mixed results';
    return 'Struggling recently';
  }

  private generateFallbackTactics(agentData: any, opponentData: any, arenaType?: number): BattleTactics {
    const agentPower = agentData.dna.strength + agentData.dna.intelligence;
    const opponentPower = opponentData.dna.strength + opponentData.dna.intelligence;
    
    let strategy = Strategy.Balanced;
    let aggressiveness = 50;
    let riskTolerance = 50;
    
    // Basic strategy selection
    if (agentData.dna.strength > agentData.dna.intelligence) {
      strategy = Strategy.Berserker;
      aggressiveness = 70;
    } else if (agentData.dna.intelligence > agentData.dna.strength) {
      strategy = Strategy.Tactician;
      riskTolerance = 30;
    }
    
    // Adjust for power difference
    if (agentPower < opponentPower) {
      strategy = Strategy.Defensive;
      aggressiveness = 30;
      riskTolerance = 80; // High risk, high reward when weaker
    }
    
    // Arena bonuses
    if (arenaType === 1 && agentData.dna.elementalAffinity === 1) { // Fire in Volcanic
      aggressiveness += 20;
    } else if (arenaType === 2 && (agentData.dna.elementalAffinity === 3 || agentData.dna.elementalAffinity === 4)) { // Earth/Air in Forest
      strategy = Strategy.Tactician;
    }
    
    return {
      aggressiveness: Math.max(0, Math.min(100, aggressiveness)),
      strategy,
      riskTolerance: Math.max(0, Math.min(100, riskTolerance)),
    };
  }

  private parseStrategy(strategy: string): Strategy {
    if (!strategy || typeof strategy !== 'string') return Strategy.Balanced;
    
    switch (strategy.toLowerCase()) {
      case 'berserker': return Strategy.Berserker;
      case 'tactician': return Strategy.Tactician;
      case 'defensive': return Strategy.Defensive;
      case 'balanced': return Strategy.Balanced;
      default: return Strategy.Balanced;
    }
  }
}