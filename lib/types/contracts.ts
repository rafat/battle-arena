// libs/types/contracts.ts
export interface DNA {
  strength: bigint
  agility: bigint
  intelligence: bigint
  elementalAffinity: number
}

export interface Agent {
  id: bigint
  level: bigint
  experience: bigint
  dna: DNA
  metadataCID: string
  equippedItem: bigint
}

export enum Strategy {
  Balanced,
  Berserker,
  Tactician,
  Defensive
}

export interface BattleTactics {
  aggressiveness: number
  strategy: Strategy
  riskTolerance: number
}

export enum ArenaType {
  NeutralFields,
  VolcanicPlains,
  MysticForest
}

export interface Battle {
  battleId: bigint
  agentIds: bigint[]
  agentHealths: bigint[]
  tactics: BattleTactics[]
  arena: ArenaType
  status: number // 0: Ongoing, 1: Finished
  winner: bigint
}
