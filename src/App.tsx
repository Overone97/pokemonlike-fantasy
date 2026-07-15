import { useEffect, useRef, useState } from 'react';

const OUTSIDE_MAP_SRC = '/pokemonlike-fantasy/assets/generated/restart/map.png';
const INSIDE_MAP_SRC = '/pokemonlike-fantasy/assets/generated/restart/house-interior.png';
const SOUTH_MAP_SRC = '/pokemonlike-fantasy/assets/generated/restart/route-south.png';
const NORTH_MAP_SRC = 'generated:north-ridge';
const EAST_MAP_SRC = 'generated:east-coast';
const WEST_MAP_SRC = 'generated:west-woods';
const ARENA_MAP_SRC = 'generated:arena';
const PLAYER_IDLE_SRC = '/pokemonlike-fantasy/assets/generated/restart/player-idle.png';
const PLAYER_WALK_SRC = '/pokemonlike-fantasy/assets/generated/restart/player-walk.png';
const BRINDIBOUH_SRC = '/pokemonlike-fantasy/assets/generated/restart/monster-brindibouh.png';
const GALETOUT_SRC = '/pokemonlike-fantasy/assets/generated/restart/monster-galetout.png';
const BULLEFROTH_SRC = '/pokemonlike-fantasy/assets/generated/restart/monster-bullefroth.png';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;
const STEP_MS = 220;
const CREATURE_STEP_MS = 260;
const PLAYER_TARGET_HEIGHT = 78;
const PLAYER_TARGET_WIDTH = 58;
const CREATURE_TARGET_HEIGHT = 54;
const CREATURE_TARGET_WIDTH = 64;
const PLAYER_BODY_WIDTH = 24;
const PLAYER_BODY_HEIGHT = 26;
const CREATURE_BODY_WIDTH = 24;
const CREATURE_BODY_HEIGHT = 22;
const INTERACT_KEY = 'e';
const CODEX_KEY = 'c';
const SHINY_RATE = 0.01;
const EVOLUTION_VICTORIES_REQUIRED = 3;

type Direction = 'up' | 'down' | 'left' | 'right';
type MapId = 'outside' | 'inside' | 'south' | 'north' | 'east' | 'west' | 'arena';
type CreatureTemplateId = 'brindibouh' | 'galetout' | 'bullefroth';
type CreatureSpeciesId =
  | 'brindibouh'
  | 'ramureine'
  | 'mousseron'
  | 'floramuse'
  | 'emberet'
  | 'pyrogriffe'
  | 'cendrours'
  | 'volcarnage'
  | 'bullefroth'
  | 'abyssobulle'
  | 'algobulle'
  | 'coralythe'
  | 'galetout'
  | 'bastionyx'
  | 'silexou'
  | 'monolithe'
  | 'voltlynx'
  | 'fulguroc'
  | 'orageon'
  | 'tempestor'
  | 'florazel'
  | 'noctplume'
  | 'spectrik'
  | 'cristalune'
  | 'bourbizon'
  | 'pyroloutre'
  | 'ferabec'
  | 'psykoto'
  | 'dracombre'
  | 'solenid';
type EncounterRarity = 'Commune' | 'Peu commune' | 'Rare' | 'Epique' | 'Legendaire';
type MoveIntent = { dx: number; dy: number; facing: Direction };
type Rect = { x: number; y: number; width: number; height: number };
type FrameMap = Record<Direction, Rect[]>;
type TriggerKind = 'door' | 'route';
type MapTrigger = Rect & {
  targetMap: MapId;
  targetX: number;
  targetY: number;
  targetFacing: Direction;
  label: string;
  kind: TriggerKind;
};
type FishingSpot = {
  id: string;
  x: number;
  y: number;
  radius: number;
  facing: Direction;
  bobberOffsetX: number;
  bobberOffsetY: number;
  label: string;
};
type Merchant = {
  x: number;
  y: number;
  radius: number;
  label: string;
};
type Sanctuary = {
  x: number;
  y: number;
  radius: number;
  label: string;
};
type InteractionPoint = {
  x: number;
  y: number;
  radius: number;
  label: string;
};
type MapDefinition = {
  id: MapId;
  name: string;
  src: string;
  spawnX: number;
  spawnY: number;
  spawnFacing: Direction;
  colliders: Rect[];
  triggers: MapTrigger[];
  fishingSpots: FishingSpot[];
  merchant?: Merchant;
  sanctuary?: Sanctuary;
  teamStation?: InteractionPoint;
  arenaDesk?: InteractionPoint;
};
type PlayerState = {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  moving: boolean;
  moveStartedAt: number;
  facing: Direction;
};
type FishSpecies = {
  name: string;
  minSize: number;
  maxSize: number;
  weight: number;
  rarity: string;
  valuePerKg: number;
};
type CaughtFish = {
  id: number;
  species: string;
  rarity: string;
  sizeCm: number;
  weightKg: number;
  value: number;
};
type FishingState =
  | { phase: 'idle' }
  | {
      phase: 'casting' | 'waiting' | 'reeling';
      startedAt: number;
      resolveAt: number;
      spotId: string;
      bobberX: number;
      bobberY: number;
      result: CaughtFish | null;
    };
type CreatureSpecies = {
  id: CreatureSpeciesId;
  name: string;
  templateId: CreatureTemplateId;
  types: string[];
  rarity: EncounterRarity;
  encounterWeight: number;
  hueShift: number;
  saturationBoost: number;
  lightnessBoost: number;
  shinyHueShift: number;
  evolutionStage: 1 | 2;
  evolvesTo?: CreatureSpeciesId;
  evolvesFrom?: CreatureSpeciesId;
  visualVariant?: CreatureVisualVariant;
  sizeScale?: number;
};
type CreatureVisualVariant =
  | 'none'
  | 'ramureine'
  | 'floramuse'
  | 'pyrogriffe'
  | 'volcarnage'
  | 'abyssobulle'
  | 'coralythe'
  | 'bastionyx'
  | 'monolithe'
  | 'fulguroc'
  | 'tempestor';
type CreatureAsset = {
  normalSheet: HTMLCanvasElement;
  shinySheet: HTMLCanvasElement;
  frames: FrameMap;
};
type BattleAction = 'frappe' | 'sceau' | 'repli';
type CapturedCreature = {
  id: number;
  speciesId: CreatureSpeciesId;
  speciesName: string;
  shiny: boolean;
  iv: number;
  victories: number;
};
type CreatureInstance = {
  id: number;
  slotId: number;
  mapId: MapId;
  speciesId: CreatureSpeciesId;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  moving: boolean;
  moveStartedAt: number;
  lastDecisionAt: number;
  facing: Direction;
  shiny: boolean;
  iv: number;
  roamBounds: Rect;
};
type HudNotice = {
  text: string;
  tone: 'info' | 'success';
  expiresAt: number;
};
type BattleState =
  | { phase: 'idle' }
  | {
      phase: 'active';
      mode: 'wild' | 'arena';
      title: string;
      allyTeam: CapturedCreature[];
      allyIndex: number;
      allyVigors: Record<number, number>;
      foeTeam: CapturedCreature[];
      foeIndex: number;
      foeVigors: Record<number, number>;
      sourceWild?: CreatureInstance;
      rewardGold: number;
      log: string;
    };
type ArenaChallenger = {
  name: string;
  rewardGold: number;
  team: Array<{ speciesId: CreatureSpeciesId; iv: number; shiny?: boolean }>;
};
type LoadedAssets = {
  maps: Record<MapId, HTMLImageElement | HTMLCanvasElement>;
  playerIdleSheet: HTMLCanvasElement;
  playerWalkSheet: HTMLCanvasElement;
  merchantIdleSheet: HTMLCanvasElement;
  playerIdleFrames: FrameMap;
  playerWalkFrames: FrameMap;
  creatures: Record<CreatureSpeciesId, CreatureAsset>;
};
type CreaturesByMap = Record<MapId, CreatureInstance[]>;
type GameState = {
  mapId: MapId;
  player: PlayerState;
  fishing: FishingState;
  fishInventory: CaughtFish[];
  capturedCreatures: CapturedCreature[];
  creaturesByMap: CreaturesByMap;
  gold: number;
  battle: BattleState;
  notice: HudNotice | null;
  seenSpecies: CreatureSpeciesId[];
  codexOpen: boolean;
  teamIds: number[];
  teamMenuOpen: boolean;
  selectedCreatureId: number | null;
  arenaProgress: number;
};

const INPUTS: Record<string, MoveIntent> = {
  arrowup: { dx: 0, dy: -1, facing: 'up' },
  z: { dx: 0, dy: -1, facing: 'up' },
  w: { dx: 0, dy: -1, facing: 'up' },
  arrowdown: { dx: 0, dy: 1, facing: 'down' },
  s: { dx: 0, dy: 1, facing: 'down' },
  arrowleft: { dx: -1, dy: 0, facing: 'left' },
  q: { dx: -1, dy: 0, facing: 'left' },
  a: { dx: -1, dy: 0, facing: 'left' },
  arrowright: { dx: 1, dy: 0, facing: 'right' },
  d: { dx: 1, dy: 0, facing: 'right' },
};

const FISH_SPECIES: FishSpecies[] = [
  { name: 'Truite claire', minSize: 18, maxSize: 42, weight: 46, rarity: 'Commune', valuePerKg: 8 },
  { name: 'Carpe mousseuse', minSize: 28, maxSize: 68, weight: 28, rarity: 'Commune', valuePerKg: 7 },
  { name: 'Perche lune', minSize: 20, maxSize: 45, weight: 16, rarity: 'Rare', valuePerKg: 16 },
  { name: 'Silure des roseaux', minSize: 55, maxSize: 120, weight: 8, rarity: 'Epique', valuePerKg: 20 },
  { name: 'Koi astrale', minSize: 24, maxSize: 52, weight: 2, rarity: 'Tres rare', valuePerKg: 55 },
];

const CREATURE_SPECIES: Record<CreatureSpeciesId, CreatureSpecies> = {
  brindibouh: {
    id: 'brindibouh',
    name: 'Brindibouh',
    templateId: 'brindibouh',
    types: ['Plante'],
    rarity: 'Commune',
    encounterWeight: 20,
    hueShift: 0,
    saturationBoost: 0,
    lightnessBoost: 0,
    shinyHueShift: 0.35,
    evolutionStage: 1,
    evolvesTo: 'ramureine',
    visualVariant: 'none',
    sizeScale: 1,
  },
  ramureine: {
    id: 'ramureine',
    name: 'Ramureine',
    templateId: 'brindibouh',
    types: ['Plante', 'Fee'],
    rarity: 'Rare',
    encounterWeight: 6,
    hueShift: 0.04,
    saturationBoost: 0.1,
    lightnessBoost: 0.08,
    shinyHueShift: 0.49,
    evolutionStage: 2,
    evolvesFrom: 'brindibouh',
    visualVariant: 'ramureine',
    sizeScale: 1.16,
  },
  mousseron: {
    id: 'mousseron',
    name: 'Mousseron',
    templateId: 'brindibouh',
    types: ['Plante', 'Fee'],
    rarity: 'Commune',
    encounterWeight: 18,
    hueShift: 0.08,
    saturationBoost: 0.04,
    lightnessBoost: 0.03,
    shinyHueShift: 0.52,
    evolutionStage: 1,
    evolvesTo: 'floramuse',
    visualVariant: 'none',
    sizeScale: 1,
  },
  floramuse: {
    id: 'floramuse',
    name: 'Floramuse',
    templateId: 'brindibouh',
    types: ['Plante', 'Fee'],
    rarity: 'Rare',
    encounterWeight: 5,
    hueShift: 0.15,
    saturationBoost: 0.08,
    lightnessBoost: 0.11,
    shinyHueShift: 0.68,
    evolutionStage: 2,
    evolvesFrom: 'mousseron',
    visualVariant: 'floramuse',
    sizeScale: 1.15,
  },
  emberet: {
    id: 'emberet',
    name: 'Emberet',
    templateId: 'brindibouh',
    types: ['Feu'],
    rarity: 'Commune',
    encounterWeight: 17,
    hueShift: -0.18,
    saturationBoost: 0.22,
    lightnessBoost: 0.02,
    shinyHueShift: 0.38,
    evolutionStage: 1,
    evolvesTo: 'pyrogriffe',
    visualVariant: 'none',
    sizeScale: 1,
  },
  pyrogriffe: {
    id: 'pyrogriffe',
    name: 'Pyrogriffe',
    templateId: 'brindibouh',
    types: ['Feu', 'Tenebres'],
    rarity: 'Rare',
    encounterWeight: 5,
    hueShift: -0.12,
    saturationBoost: 0.32,
    lightnessBoost: 0.06,
    shinyHueShift: 0.28,
    evolutionStage: 2,
    evolvesFrom: 'emberet',
    visualVariant: 'pyrogriffe',
    sizeScale: 1.15,
  },
  cendrours: {
    id: 'cendrours',
    name: 'Cendrours',
    templateId: 'galetout',
    types: ['Feu', 'Sol'],
    rarity: 'Peu commune',
    encounterWeight: 12,
    hueShift: -0.15,
    saturationBoost: 0.18,
    lightnessBoost: -0.03,
    shinyHueShift: 0.34,
    evolutionStage: 1,
    evolvesTo: 'volcarnage',
    visualVariant: 'none',
    sizeScale: 1,
  },
  volcarnage: {
    id: 'volcarnage',
    name: 'Volcarnage',
    templateId: 'galetout',
    types: ['Feu', 'Sol'],
    rarity: 'Epique',
    encounterWeight: 3,
    hueShift: -0.11,
    saturationBoost: 0.28,
    lightnessBoost: -0.08,
    shinyHueShift: 0.08,
    evolutionStage: 2,
    evolvesFrom: 'cendrours',
    visualVariant: 'volcarnage',
    sizeScale: 1.18,
  },
  bullefroth: {
    id: 'bullefroth',
    name: 'Bullefroth',
    templateId: 'bullefroth',
    types: ['Eau'],
    rarity: 'Commune',
    encounterWeight: 19,
    hueShift: 0,
    saturationBoost: 0,
    lightnessBoost: 0,
    shinyHueShift: 0.48,
    evolutionStage: 1,
    evolvesTo: 'abyssobulle',
    visualVariant: 'none',
    sizeScale: 1,
  },
  abyssobulle: {
    id: 'abyssobulle',
    name: 'Abyssobulle',
    templateId: 'bullefroth',
    types: ['Eau', 'Spectre'],
    rarity: 'Rare',
    encounterWeight: 6,
    hueShift: 0.58,
    saturationBoost: 0.1,
    lightnessBoost: -0.14,
    shinyHueShift: 0.83,
    evolutionStage: 2,
    evolvesFrom: 'bullefroth',
    visualVariant: 'abyssobulle',
    sizeScale: 1.16,
  },
  algobulle: {
    id: 'algobulle',
    name: 'Algobulle',
    templateId: 'bullefroth',
    types: ['Eau', 'Plante'],
    rarity: 'Peu commune',
    encounterWeight: 13,
    hueShift: 0.18,
    saturationBoost: 0.08,
    lightnessBoost: -0.01,
    shinyHueShift: 0.44,
    evolutionStage: 1,
    evolvesTo: 'coralythe',
    visualVariant: 'none',
    sizeScale: 1,
  },
  coralythe: {
    id: 'coralythe',
    name: 'Coralythe',
    templateId: 'bullefroth',
    types: ['Eau', 'Plante'],
    rarity: 'Rare',
    encounterWeight: 5,
    hueShift: 0.24,
    saturationBoost: 0.15,
    lightnessBoost: 0.02,
    shinyHueShift: 0.63,
    evolutionStage: 2,
    evolvesFrom: 'algobulle',
    visualVariant: 'coralythe',
    sizeScale: 1.14,
  },
  galetout: {
    id: 'galetout',
    name: 'Galetout',
    templateId: 'galetout',
    types: ['Roche'],
    rarity: 'Commune',
    encounterWeight: 16,
    hueShift: 0,
    saturationBoost: 0,
    lightnessBoost: 0,
    shinyHueShift: 0.58,
    evolutionStage: 1,
    evolvesTo: 'bastionyx',
    visualVariant: 'none',
    sizeScale: 1,
  },
  bastionyx: {
    id: 'bastionyx',
    name: 'Bastionyx',
    templateId: 'galetout',
    types: ['Roche', 'Acier'],
    rarity: 'Rare',
    encounterWeight: 5,
    hueShift: 0.03,
    saturationBoost: -0.04,
    lightnessBoost: -0.02,
    shinyHueShift: 0.69,
    evolutionStage: 2,
    evolvesFrom: 'galetout',
    visualVariant: 'bastionyx',
    sizeScale: 1.17,
  },
  silexou: {
    id: 'silexou',
    name: 'Silexou',
    templateId: 'galetout',
    types: ['Roche', 'Acier'],
    rarity: 'Peu commune',
    encounterWeight: 12,
    hueShift: 0.06,
    saturationBoost: -0.06,
    lightnessBoost: 0.04,
    shinyHueShift: 0.61,
    evolutionStage: 1,
    evolvesTo: 'monolithe',
    visualVariant: 'none',
    sizeScale: 1,
  },
  monolithe: {
    id: 'monolithe',
    name: 'Monolithe',
    templateId: 'galetout',
    types: ['Roche', 'Acier'],
    rarity: 'Epique',
    encounterWeight: 3,
    hueShift: 0.08,
    saturationBoost: -0.1,
    lightnessBoost: 0.08,
    shinyHueShift: 0.81,
    evolutionStage: 2,
    evolvesFrom: 'silexou',
    visualVariant: 'monolithe',
    sizeScale: 1.18,
  },
  voltlynx: {
    id: 'voltlynx',
    name: 'Voltlynx',
    templateId: 'brindibouh',
    types: ['Electrik'],
    rarity: 'Peu commune',
    encounterWeight: 12,
    hueShift: -0.27,
    saturationBoost: 0.28,
    lightnessBoost: 0.1,
    shinyHueShift: 0.56,
    evolutionStage: 1,
    evolvesTo: 'fulguroc',
    visualVariant: 'none',
    sizeScale: 1,
  },
  fulguroc: {
    id: 'fulguroc',
    name: 'Fulguroc',
    templateId: 'brindibouh',
    types: ['Electrik', 'Acier'],
    rarity: 'Rare',
    encounterWeight: 5,
    hueShift: -0.24,
    saturationBoost: 0.36,
    lightnessBoost: 0.14,
    shinyHueShift: 0.73,
    evolutionStage: 2,
    evolvesFrom: 'voltlynx',
    visualVariant: 'fulguroc',
    sizeScale: 1.15,
  },
  orageon: {
    id: 'orageon',
    name: 'Orageon',
    templateId: 'bullefroth',
    types: ['Electrik', 'Vol'],
    rarity: 'Rare',
    encounterWeight: 8,
    hueShift: -0.22,
    saturationBoost: 0.22,
    lightnessBoost: 0.08,
    shinyHueShift: 0.63,
    evolutionStage: 1,
    evolvesTo: 'tempestor',
    visualVariant: 'none',
    sizeScale: 1,
  },
  tempestor: {
    id: 'tempestor',
    name: 'Tempestor',
    templateId: 'bullefroth',
    types: ['Electrik', 'Vol'],
    rarity: 'Epique',
    encounterWeight: 3,
    hueShift: -0.28,
    saturationBoost: 0.28,
    lightnessBoost: 0.14,
    shinyHueShift: 0.91,
    evolutionStage: 2,
    evolvesFrom: 'orageon',
    visualVariant: 'tempestor',
    sizeScale: 1.18,
  },
  florazel: {
    id: 'florazel',
    name: 'Florazel',
    templateId: 'brindibouh',
    types: ['Fee', 'Plante'],
    rarity: 'Peu commune',
    encounterWeight: 11,
    hueShift: 0.32,
    saturationBoost: 0.18,
    lightnessBoost: 0.12,
    shinyHueShift: 0.67,
    evolutionStage: 1,
    visualVariant: 'none',
    sizeScale: 1,
  },
  noctplume: {
    id: 'noctplume',
    name: 'Noctplume',
    templateId: 'bullefroth',
    types: ['Tenebres', 'Vol'],
    rarity: 'Rare',
    encounterWeight: 7,
    hueShift: 0.74,
    saturationBoost: -0.08,
    lightnessBoost: -0.18,
    shinyHueShift: 0.16,
    evolutionStage: 1,
    visualVariant: 'none',
    sizeScale: 1,
  },
  spectrik: {
    id: 'spectrik',
    name: 'Spectrik',
    templateId: 'bullefroth',
    types: ['Spectre', 'Electrik'],
    rarity: 'Rare',
    encounterWeight: 7,
    hueShift: 0.57,
    saturationBoost: 0.12,
    lightnessBoost: -0.04,
    shinyHueShift: 0.1,
    evolutionStage: 1,
    visualVariant: 'none',
    sizeScale: 1,
  },
  cristalune: {
    id: 'cristalune',
    name: 'Cristalune',
    templateId: 'bullefroth',
    types: ['Glace', 'Fee'],
    rarity: 'Rare',
    encounterWeight: 6,
    hueShift: 0.46,
    saturationBoost: 0.02,
    lightnessBoost: 0.2,
    shinyHueShift: 0.76,
    evolutionStage: 1,
    visualVariant: 'none',
    sizeScale: 1,
  },
  bourbizon: {
    id: 'bourbizon',
    name: 'Bourbizon',
    templateId: 'galetout',
    types: ['Poison', 'Sol'],
    rarity: 'Peu commune',
    encounterWeight: 10,
    hueShift: 0.82,
    saturationBoost: 0.08,
    lightnessBoost: -0.08,
    shinyHueShift: 0.4,
    evolutionStage: 1,
    visualVariant: 'none',
    sizeScale: 1,
  },
  pyroloutre: {
    id: 'pyroloutre',
    name: 'Pyroloutre',
    templateId: 'bullefroth',
    types: ['Feu', 'Eau'],
    rarity: 'Epique',
    encounterWeight: 4,
    hueShift: -0.16,
    saturationBoost: 0.24,
    lightnessBoost: 0.02,
    shinyHueShift: 0.3,
    evolutionStage: 1,
    visualVariant: 'none',
    sizeScale: 1,
  },
  ferabec: {
    id: 'ferabec',
    name: 'Ferabec',
    templateId: 'galetout',
    types: ['Acier', 'Vol'],
    rarity: 'Rare',
    encounterWeight: 6,
    hueShift: 0.1,
    saturationBoost: -0.12,
    lightnessBoost: 0.1,
    shinyHueShift: 0.72,
    evolutionStage: 1,
    visualVariant: 'none',
    sizeScale: 1,
  },
  psykoto: {
    id: 'psykoto',
    name: 'Psykoto',
    templateId: 'brindibouh',
    types: ['Psy'],
    rarity: 'Epique',
    encounterWeight: 4,
    hueShift: 0.39,
    saturationBoost: 0.2,
    lightnessBoost: 0.08,
    shinyHueShift: 0.88,
    evolutionStage: 1,
    visualVariant: 'none',
    sizeScale: 1,
  },
  dracombre: {
    id: 'dracombre',
    name: 'Dracombre',
    templateId: 'galetout',
    types: ['Dragon', 'Tenebres'],
    rarity: 'Epique',
    encounterWeight: 3,
    hueShift: 0.67,
    saturationBoost: 0.06,
    lightnessBoost: -0.12,
    shinyHueShift: 0.21,
    evolutionStage: 1,
    visualVariant: 'none',
    sizeScale: 1,
  },
  solenid: {
    id: 'solenid',
    name: 'Solenid',
    templateId: 'brindibouh',
    types: ['Insecte', 'Lumiere'],
    rarity: 'Legendaire',
    encounterWeight: 1,
    hueShift: -0.31,
    saturationBoost: 0.26,
    lightnessBoost: 0.16,
    shinyHueShift: 0.12,
    evolutionStage: 1,
    visualVariant: 'none',
    sizeScale: 1,
  },
};

const CREATURE_TEMPLATE_SOURCES: Record<CreatureTemplateId, string> = {
  brindibouh: BRINDIBOUH_SRC,
  galetout: GALETOUT_SRC,
  bullefroth: BULLEFROTH_SRC,
};

const SOUTH_SPAWN_SLOTS: Rect[] = [
  { x: 170, y: 168, width: 168, height: 116 },
  { x: 514, y: 152, width: 170, height: 118 },
  { x: 352, y: 280, width: 196, height: 126 },
  { x: 684, y: 302, width: 160, height: 124 },
  { x: 188, y: 452, width: 176, height: 118 },
  { x: 576, y: 480, width: 178, height: 100 },
  { x: 306, y: 184, width: 130, height: 96 },
  { x: 638, y: 188, width: 126, height: 94 },
];

const NORTH_SPAWN_SLOTS: Rect[] = [
  { x: 158, y: 150, width: 170, height: 112 },
  { x: 404, y: 164, width: 150, height: 108 },
  { x: 644, y: 150, width: 162, height: 114 },
  { x: 230, y: 352, width: 178, height: 124 },
  { x: 536, y: 338, width: 180, height: 128 },
  { x: 720, y: 430, width: 120, height: 112 },
];

const EAST_SPAWN_SLOTS: Rect[] = [
  { x: 140, y: 152, width: 190, height: 120 },
  { x: 392, y: 178, width: 172, height: 118 },
  { x: 686, y: 160, width: 146, height: 112 },
  { x: 242, y: 412, width: 170, height: 126 },
  { x: 584, y: 430, width: 170, height: 116 },
];

const WEST_SPAWN_SLOTS: Rect[] = [
  { x: 150, y: 186, width: 152, height: 112 },
  { x: 374, y: 146, width: 194, height: 118 },
  { x: 640, y: 188, width: 158, height: 118 },
  { x: 236, y: 408, width: 170, height: 122 },
  { x: 536, y: 392, width: 182, height: 124 },
];

const ENCOUNTER_POOLS: Record<MapId, CreatureSpeciesId[]> = {
  outside: [],
  inside: [],
  south: [
    'brindibouh',
    'ramureine',
    'mousseron',
    'floramuse',
    'emberet',
    'pyrogriffe',
    'cendrours',
    'volcarnage',
    'voltlynx',
    'fulguroc',
    'solenid',
  ],
  north: [
    'mousseron',
    'floramuse',
    'florazel',
    'cristalune',
    'spectrik',
    'ramureine',
    'silexou',
    'monolithe',
    'solenid',
  ],
  east: [
    'bullefroth',
    'abyssobulle',
    'algobulle',
    'coralythe',
    'orageon',
    'tempestor',
    'pyroloutre',
    'spectrik',
    'cristalune',
  ],
  west: [
    'galetout',
    'bastionyx',
    'silexou',
    'monolithe',
    'bourbizon',
    'ferabec',
    'dracombre',
    'voltlynx',
    'noctplume',
  ],
  arena: [],
};

const ARENA_CHALLENGERS: ArenaChallenger[] = [
  {
    name: 'Lysa des herbes',
    rewardGold: 24,
    team: [
      { speciesId: 'mousseron', iv: 42 },
      { speciesId: 'emberet', iv: 46 },
      { speciesId: 'bullefroth', iv: 44 },
    ],
  },
  {
    name: 'Coren des braises',
    rewardGold: 36,
    team: [
      { speciesId: 'cendrours', iv: 58 },
      { speciesId: 'galetout', iv: 52 },
      { speciesId: 'voltlynx', iv: 55 },
      { speciesId: 'algobulle', iv: 54 },
    ],
  },
  {
    name: 'Nacre la marieuse',
    rewardGold: 48,
    team: [
      { speciesId: 'abyssobulle', iv: 62 },
      { speciesId: 'coralythe', iv: 60 },
      { speciesId: 'ferabec', iv: 59 },
      { speciesId: 'cristalune', iv: 61 },
    ],
  },
  {
    name: 'Torv du rempart',
    rewardGold: 62,
    team: [
      { speciesId: 'bastionyx', iv: 68 },
      { speciesId: 'pyrogriffe', iv: 66 },
      { speciesId: 'monolithe', iv: 70 },
      { speciesId: 'tempestor', iv: 67 },
      { speciesId: 'spectrik', iv: 64 },
    ],
  },
  {
    name: 'Maître Aster',
    rewardGold: 90,
    team: [
      { speciesId: 'ramureine', iv: 72 },
      { speciesId: 'volcarnage', iv: 76 },
      { speciesId: 'fulguroc', iv: 74 },
      { speciesId: 'dracombre', iv: 78 },
      { speciesId: 'solenid', iv: 82, shiny: true },
      { speciesId: 'tempestor', iv: 75 },
    ],
  },
];

const MAPS: Record<MapId, MapDefinition> = {
  outside: {
    id: 'outside',
    name: 'Clairiere du lac',
    src: OUTSIDE_MAP_SRC,
    spawnX: 450,
    spawnY: 360,
    spawnFacing: 'down',
    colliders: [
      { x: 0, y: 0, width: 412, height: 20 },
      { x: 548, y: 0, width: CANVAS_WIDTH - 548, height: 20 },
      { x: 0, y: 0, width: 26, height: 244 },
      { x: 0, y: 394, width: 26, height: CANVAS_HEIGHT - 394 },
      { x: CANVAS_WIDTH - 26, y: 0, width: 26, height: 236 },
      { x: CANVAS_WIDTH - 26, y: 390, width: 26, height: CANVAS_HEIGHT - 390 },
      { x: 0, y: CANVAS_HEIGHT - 26, width: 416, height: 26 },
      { x: 544, y: CANVAS_HEIGHT - 26, width: CANVAS_WIDTH - 544, height: 26 },
      { x: 8, y: 92, width: 205, height: 120 },
      { x: 0, y: 212, width: 170, height: 74 },
      { x: 0, y: 288, width: 134, height: 78 },
      { x: 26, y: 366, width: 136, height: 54 },
      { x: 690, y: 28, width: 197, height: 136 },
      { x: 700, y: 164, width: 54, height: 48 },
      { x: 816, y: 164, width: 54, height: 48 },
      { x: 792, y: 420, width: 102, height: 90 },
      { x: 288, y: 46, width: 126, height: 94 },
    ],
    triggers: [
      {
        x: 424,
        y: 0,
        width: 112,
        height: 48,
        targetMap: 'north',
        targetX: 480,
        targetY: 556,
        targetFacing: 'up',
        label: 'Monter vers la crete nord',
        kind: 'route',
      },
      {
        x: 754,
        y: 178,
        width: 62,
        height: 44,
        targetMap: 'inside',
        targetX: 478,
        targetY: 554,
        targetFacing: 'up',
        label: 'Entrer dans la maison',
        kind: 'door',
      },
      {
        x: 0,
        y: 254,
        width: 50,
        height: 128,
        targetMap: 'west',
        targetX: 872,
        targetY: 320,
        targetFacing: 'left',
        label: 'Prendre la sente ouest',
        kind: 'route',
      },
      {
        x: 910,
        y: 246,
        width: 50,
        height: 136,
        targetMap: 'east',
        targetX: 88,
        targetY: 324,
        targetFacing: 'right',
        label: 'Suivre la cote est',
        kind: 'route',
      },
      {
        x: 430,
        y: 572,
        width: 100,
        height: 44,
        targetMap: 'south',
        targetX: 480,
        targetY: 112,
        targetFacing: 'down',
        label: 'Prendre la route du sud',
        kind: 'route',
      },
      {
        x: 632,
        y: 572,
        width: 104,
        height: 44,
        targetMap: 'arena',
        targetX: 480,
        targetY: 564,
        targetFacing: 'up',
        label: 'Entrer dans l arene des echos',
        kind: 'door',
      },
    ],
    fishingSpots: [
      {
        id: 'dock',
        x: 196,
        y: 288,
        radius: 44,
        facing: 'left',
        bobberOffsetX: -54,
        bobberOffsetY: -8,
        label: 'Ponton',
      },
      {
        id: 'north-bank',
        x: 172,
        y: 178,
        radius: 42,
        facing: 'left',
        bobberOffsetX: -42,
        bobberOffsetY: 6,
        label: 'Rive nord',
      },
      {
        id: 'south-bank',
        x: 160,
        y: 340,
        radius: 40,
        facing: 'left',
        bobberOffsetX: -34,
        bobberOffsetY: -6,
        label: 'Rive sud',
      },
    ],
    merchant: {
      x: 642,
      y: 302,
      radius: 56,
      label: 'Marchand',
    },
  },
  inside: {
    id: 'inside',
    name: 'Interieur de la maison',
    src: INSIDE_MAP_SRC,
    spawnX: 478,
    spawnY: 554,
    spawnFacing: 'up',
    colliders: [
      { x: 0, y: 0, width: CANVAS_WIDTH, height: 66 },
      { x: 0, y: 0, width: 60, height: CANVAS_HEIGHT },
      { x: CANVAS_WIDTH - 60, y: 0, width: 60, height: CANVAS_HEIGHT },
      { x: 0, y: 0, width: CANVAS_WIDTH, height: 28 },
      { x: 0, y: CANVAS_HEIGHT - 28, width: 430, height: 28 },
      { x: 526, y: CANVAS_HEIGHT - 28, width: 434, height: 28 },
      { x: 112, y: 108, width: 204, height: 168 },
      { x: 560, y: 84, width: 164, height: 158 },
      { x: 764, y: 118, width: 150, height: 212 },
      { x: 94, y: 500, width: 192, height: 74 },
      { x: 712, y: 506, width: 140, height: 76 },
    ],
    triggers: [
      {
        x: 448,
        y: 576,
        width: 64,
        height: 38,
        targetMap: 'outside',
        targetX: 784,
        targetY: 252,
        targetFacing: 'down',
        label: 'Sortir de la maison',
        kind: 'door',
      },
    ],
    fishingSpots: [],
    teamStation: {
      x: 482,
      y: 252,
      radius: 68,
      label: 'Table des liens',
    },
  },
  south: {
    id: 'south',
    name: 'Route du sud',
    src: SOUTH_MAP_SRC,
    spawnX: 480,
    spawnY: 112,
    spawnFacing: 'down',
    colliders: [
      { x: 0, y: 0, width: 420, height: 26 },
      { x: 540, y: 0, width: 420, height: 26 },
      { x: 0, y: 0, width: 26, height: CANVAS_HEIGHT },
      { x: CANVAS_WIDTH - 26, y: 0, width: 26, height: CANVAS_HEIGHT },
      { x: 0, y: CANVAS_HEIGHT - 24, width: CANVAS_WIDTH, height: 24 },
      { x: 0, y: 58, width: 316, height: 98 },
      { x: 640, y: 58, width: 320, height: 98 },
      { x: 0, y: 438, width: 362, height: 158 },
      { x: 342, y: 462, width: 190, height: 82 },
      { x: 548, y: 428, width: 412, height: 154 },
    ],
    triggers: [
      {
        x: 438,
        y: 0,
        width: 84,
        height: 54,
        targetMap: 'outside',
        targetX: 480,
        targetY: 540,
        targetFacing: 'up',
        label: 'Retour au village',
        kind: 'route',
      },
    ],
    fishingSpots: [],
  },
  north: {
    id: 'north',
    name: 'Crete d aurore',
    src: NORTH_MAP_SRC,
    spawnX: 480,
    spawnY: 556,
    spawnFacing: 'up',
    colliders: [
      { x: 0, y: 0, width: 26, height: CANVAS_HEIGHT },
      { x: CANVAS_WIDTH - 26, y: 0, width: 26, height: CANVAS_HEIGHT },
      { x: 0, y: 0, width: CANVAS_WIDTH, height: 26 },
      { x: 0, y: CANVAS_HEIGHT - 26, width: 420, height: 26 },
      { x: 540, y: CANVAS_HEIGHT - 26, width: CANVAS_WIDTH - 540, height: 26 },
      { x: 0, y: 72, width: 186, height: 126 },
      { x: 742, y: 84, width: 218, height: 138 },
      { x: 278, y: 282, width: 154, height: 64 },
      { x: 556, y: 292, width: 156, height: 70 },
      { x: 88, y: 462, width: 226, height: 92 },
    ],
    triggers: [
      {
        x: 438,
        y: 586,
        width: 84,
        height: 54,
        targetMap: 'outside',
        targetX: 480,
        targetY: 72,
        targetFacing: 'down',
        label: 'Redescendre au village',
        kind: 'route',
      },
    ],
    fishingSpots: [],
    sanctuary: {
      x: 510,
      y: 136,
      radius: 60,
      label: 'Source claire',
    },
  },
  east: {
    id: 'east',
    name: 'Cote de nacre',
    src: EAST_MAP_SRC,
    spawnX: 88,
    spawnY: 324,
    spawnFacing: 'right',
    colliders: [
      { x: 0, y: 0, width: 26, height: 260 },
      { x: 0, y: 390, width: 26, height: CANVAS_HEIGHT - 390 },
      { x: CANVAS_WIDTH - 26, y: 0, width: 26, height: CANVAS_HEIGHT },
      { x: 0, y: 0, width: CANVAS_WIDTH, height: 28 },
      { x: 0, y: CANVAS_HEIGHT - 26, width: CANVAS_WIDTH, height: 26 },
      { x: 164, y: 64, width: 202, height: 124 },
      { x: 476, y: 122, width: 180, height: 98 },
      { x: 730, y: 84, width: 176, height: 126 },
      { x: 128, y: 458, width: 210, height: 90 },
      { x: 450, y: 420, width: 186, height: 102 },
    ],
    triggers: [
      {
        x: 0,
        y: 246,
        width: 46,
        height: 136,
        targetMap: 'outside',
        targetX: 872,
        targetY: 314,
        targetFacing: 'left',
        label: 'Retour au village',
        kind: 'route',
      },
    ],
    fishingSpots: [
      {
        id: 'east-pier',
        x: 860,
        y: 332,
        radius: 42,
        facing: 'right',
        bobberOffsetX: 34,
        bobberOffsetY: 6,
        label: 'Jetee de nacre',
      },
    ],
  },
  west: {
    id: 'west',
    name: 'Bois chuchotants',
    src: WEST_MAP_SRC,
    spawnX: 872,
    spawnY: 320,
    spawnFacing: 'left',
    colliders: [
      { x: 0, y: 0, width: 26, height: CANVAS_HEIGHT },
      { x: CANVAS_WIDTH - 26, y: 0, width: 26, height: 246 },
      { x: CANVAS_WIDTH - 26, y: 396, width: 26, height: CANVAS_HEIGHT - 396 },
      { x: 0, y: 0, width: CANVAS_WIDTH, height: 28 },
      { x: 0, y: CANVAS_HEIGHT - 26, width: CANVAS_WIDTH, height: 26 },
      { x: 88, y: 92, width: 188, height: 128 },
      { x: 394, y: 64, width: 174, height: 104 },
      { x: 676, y: 106, width: 186, height: 122 },
      { x: 210, y: 434, width: 174, height: 92 },
      { x: 520, y: 392, width: 202, height: 110 },
    ],
    triggers: [
      {
        x: 914,
        y: 254,
        width: 46,
        height: 132,
        targetMap: 'outside',
        targetX: 84,
        targetY: 320,
        targetFacing: 'right',
        label: 'Retour au village',
        kind: 'route',
      },
    ],
    fishingSpots: [],
  },
  arena: {
    id: 'arena',
    name: 'Arene des echos',
    src: ARENA_MAP_SRC,
    spawnX: 480,
    spawnY: 564,
    spawnFacing: 'up',
    colliders: [
      { x: 0, y: 0, width: CANVAS_WIDTH, height: 36 },
      { x: 0, y: 0, width: 74, height: CANVAS_HEIGHT },
      { x: CANVAS_WIDTH - 74, y: 0, width: 74, height: CANVAS_HEIGHT },
      { x: 0, y: CANVAS_HEIGHT - 28, width: 432, height: 28 },
      { x: 528, y: CANVAS_HEIGHT - 28, width: 432, height: 28 },
      { x: 102, y: 96, width: 202, height: 148 },
      { x: 658, y: 96, width: 200, height: 148 },
      { x: 268, y: 432, width: 124, height: 64 },
      { x: 568, y: 432, width: 124, height: 64 },
    ],
    triggers: [
      {
        x: 448,
        y: 582,
        width: 64,
        height: 34,
        targetMap: 'outside',
        targetX: 684,
        targetY: 540,
        targetFacing: 'down',
        label: 'Sortir de l arene',
        kind: 'door',
      },
    ],
    fishingSpots: [],
    arenaDesk: {
      x: 480,
      y: 162,
      radius: 78,
      label: 'Dalle du duel',
    },
    sanctuary: {
      x: 480,
      y: 478,
      radius: 52,
      label: 'Bassin des souffles',
    },
  },
};

function createPlayerForMap(mapId: MapId): PlayerState {
  const map = MAPS[mapId];
  return {
    x: map.spawnX,
    y: map.spawnY,
    startX: map.spawnX,
    startY: map.spawnY,
    targetX: map.spawnX,
    targetY: map.spawnY,
    moving: false,
    moveStartedAt: 0,
    facing: map.spawnFacing,
  };
}

function createCreaturesForMap(mapId: MapId, slots: Rect[]) {
  return slots.map((roamBounds, index) => createEncounter(mapId, index, roamBounds));
}

function createInitialGameState(): GameState {
  const starter = createStarterCreature();
  return {
    mapId: 'outside',
    player: createPlayerForMap('outside'),
    fishing: { phase: 'idle' },
    fishInventory: [],
    capturedCreatures: [starter],
    creaturesByMap: {
      outside: [],
      inside: [],
      south: createCreaturesForMap('south', SOUTH_SPAWN_SLOTS),
      north: createCreaturesForMap('north', NORTH_SPAWN_SLOTS),
      east: createCreaturesForMap('east', EAST_SPAWN_SLOTS),
      west: createCreaturesForMap('west', WEST_SPAWN_SLOTS),
      arena: [],
    },
    gold: 0,
    battle: { phase: 'idle' },
    notice: null,
    seenSpecies: [starter.speciesId],
    codexOpen: false,
    teamIds: [starter.id],
    teamMenuOpen: false,
    selectedCreatureId: starter.id,
    arenaProgress: 0,
  };
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetsRef = useRef<LoadedAssets | null>(null);
  const heldDirectionRef = useRef<Direction | null>(null);
  const bufferedDirectionRef = useRef<Direction | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [game, setGame] = useState<GameState>(() => createInitialGameState());

  useEffect(() => {
    let cancelled = false;

    buildAssets()
      .then((assets) => {
        if (cancelled) return;
        assetsRef.current = assets;
        setReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Chargement des assets impossible.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (game.teamMenuOpen) {
        if (key === 'escape' || key === INTERACT_KEY) {
          event.preventDefault();
          setGame((current) => ({
            ...current,
            teamMenuOpen: false,
            notice: {
              text: 'Table des liens refermee.',
              tone: 'info',
              expiresAt: performance.now() + 1600,
            },
          }));
        }
        return;
      }

      if (key === '1' || key === '2' || key === '3') {
        event.preventDefault();
        setGame((current) => handleBattleInput(current, key, performance.now()));
        return;
      }

      if (key === CODEX_KEY) {
        event.preventDefault();
        setGame((current) => ({
          ...current,
          codexOpen: !current.codexOpen,
        }));
        return;
      }

      const input = INPUTS[key];
      if (input) {
        event.preventDefault();
        heldDirectionRef.current = input.facing;
        bufferedDirectionRef.current = input.facing;

        setGame((current) => {
          if (current.battle.phase !== 'idle') {
            return current;
          }
          if (current.fishing.phase !== 'idle') {
            return {
              ...current,
              player:
                current.player.facing === input.facing
                  ? current.player
                  : { ...current.player, facing: input.facing },
            };
          }

          if (current.player.moving) {
            return {
              ...current,
              player:
                current.player.facing === input.facing
                  ? current.player
                  : { ...current.player, facing: input.facing },
            };
          }

          return {
            ...current,
            player: attemptPlayerMove(current.player, input, performance.now(), MAPS[current.mapId].colliders),
          };
        });
        return;
      }

      if (key === INTERACT_KEY) {
        event.preventDefault();
        setGame((current) => handlePrimaryAction(current, performance.now()));
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const input = INPUTS[event.key.toLowerCase()];
      if (!input) return;

      if (heldDirectionRef.current === input.facing) {
        heldDirectionRef.current = null;
      }
      if (bufferedDirectionRef.current === input.facing) {
        bufferedDirectionRef.current = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [game.teamMenuOpen]);

  useEffect(() => {
    let frameId = 0;

    const tick = (timestamp: number) => {
      setGame((current) =>
        advanceGameState(current, timestamp, bufferedDirectionRef.current, heldDirectionRef.current),
      );
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const assets = assetsRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (!ready || !assets) {
      drawLoadingState(context, loadError);
      return;
    }

    renderScene(context, assets, game);
  }, [game, loadError, ready]);

  const map = MAPS[game.mapId];
  const fishCounts = countFishBySpecies(game.fishInventory);
  const fishValue = getFishInventoryValue(game.fishInventory);
  const actionHint = getActionHint(game);
  const shinyCount = game.capturedCreatures.filter((creature) => creature.shiny).length;
  const activeTeam = getActiveTeam(game);
  const reserveTeam = getReserveCreatures(game);
  const selectedCreature = game.selectedCreatureId
    ? game.capturedCreatures.find((creature) => creature.id === game.selectedCreatureId) ?? null
    : null;
  const activeBinder = activeTeam[0] ?? null;
  const nextArenaChallenger = ARENA_CHALLENGERS[Math.min(game.arenaProgress, ARENA_CHALLENGERS.length - 1)];

  return (
    <main className="app-shell">
      <section className="intro-card">
        <p className="eyebrow">Proto fantasy</p>
        <h1>Monde etendu, codex et sanctuaire</h1>
        <p className="description">
          Le village sert maintenant de vrai carrefour: reserve d equipe dans la maison, arene a paliers,
          sanctuaires, codex et vrais affrontements d equipe jusqu a six creatures.
        </p>
        <div className="tips">
          <span>Deplacement: fleches, ZQSD ou WASD</span>
          <span>Action: E pour pecher, gerer ton equipe, lancer un duel ou defier l arene</span>
          <span>Duel: 1 Frappe, 2 Sceau ou Focus, 3 Repli</span>
          <span>Codex: C pour ouvrir ou fermer</span>
          <span>Carte actuelle: {map.name}</span>
        </div>
      </section>

      <section className="game-frame">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          aria-label="Carte fantasy avec village, marchand et creatures a capturer"
        />
      </section>

      <section className="hud-card">
        <div className="hud-block">
          <p className="hud-label">Etat</p>
          <p className="hud-value">{actionHint}</p>
          <p className={`hud-note ${game.notice?.tone ?? 'info'}`}>
            {game.notice?.text ??
              'Le shiny tombe a 1 sur 100. Donc oui, il va forcement te narguer quand tu ne regardes pas.'}
          </p>
          <p className="hud-stat">Or: {game.gold.toFixed(1)} pieces</p>
          {activeBinder ? (
            <p className="hud-stat">
              Meneur: {activeBinder.shiny ? 'Shiny ' : ''}
              {activeBinder.speciesName} {activeBinder.iv}% IV
              {CREATURE_SPECIES[activeBinder.speciesId].evolvesTo
                ? ` | Ascension ${Math.min(activeBinder.victories, EVOLUTION_VICTORIES_REQUIRED)}/${EVOLUTION_VICTORIES_REQUIRED}`
                : ' | Forme finale'}
            </p>
          ) : null}
        </div>

        <div className="hud-block">
          <p className="hud-label">Sac du marchand</p>
          {fishCounts.length > 0 ? (
            <div className="inventory-list">
              {fishCounts.map((entry) => (
                <span key={entry.species}>
                  {entry.species}: {entry.count}
                </span>
              ))}
            </div>
          ) : (
            <p className="hud-value">Aucun poisson a vendre pour le moment.</p>
          )}
          <p className="hud-stat">Valeur de revente: {fishValue.toFixed(1)} pieces</p>
        </div>

        <div className="hud-block">
          <p className="hud-label">Equipe capturee</p>
          {activeTeam.length > 0 ? (
            <div className="inventory-list">
              {activeTeam.map((creature, index) => (
                <span key={creature.id}>
                  #{index + 1} {renderCapturedLabel(creature)}
                </span>
              ))}
            </div>
          ) : (
            <p className="hud-value">Rien capture. Va fouiller la route du sud.</p>
          )}
          <p className="hud-stat">
            Actives: {activeTeam.length}/6 | Reserve: {reserveTeam.length} | Total shiny: {shinyCount}
          </p>
        </div>

        <div className="hud-block">
          <p className="hud-label">Codex et arene</p>
          <p className="hud-value">
            {game.seenSpecies.length} apercues, {game.capturedCreatures.length} liees
          </p>
          <p className="hud-stat">
            Zones ouvertes: village, sud, nord, est, ouest
          </p>
          <p className="hud-stat">
            Prochain duel d arene: {nextArenaChallenger.name} | palier {Math.min(game.arenaProgress + 1, ARENA_CHALLENGERS.length)}/{ARENA_CHALLENGERS.length}
          </p>
        </div>
      </section>

      {game.teamMenuOpen ? (
        <section className="team-panel">
          <div className="team-panel-card">
            <p className="eyebrow">Maison des liens</p>
            <h2>Composer l equipe active</h2>
            <p className="team-panel-copy">
              Clique une creature puis choisis son role. L arene prend toujours les six premieres places actives.
            </p>
            <div className="team-panel-grid">
              <div>
                <p className="hud-label">Equipe active</p>
                <div className="team-list">
                  {activeTeam.map((creature, index) => (
                    <button
                      key={creature.id}
                      type="button"
                      className={`team-chip ${game.selectedCreatureId === creature.id ? 'selected' : ''}`}
                      onClick={() => setGame((current) => selectCreature(current, creature.id))}
                    >
                      #{index + 1} {renderCapturedLabel(creature)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="hud-label">Reserve</p>
                <div className="team-list">
                  {reserveTeam.length > 0 ? (
                    reserveTeam.map((creature) => (
                      <button
                        key={creature.id}
                        type="button"
                        className={`team-chip ${game.selectedCreatureId === creature.id ? 'selected' : ''}`}
                        onClick={() => setGame((current) => selectCreature(current, creature.id))}
                      >
                        {renderCapturedLabel(creature)}
                      </button>
                    ))
                  ) : (
                    <p className="hud-value">Reserve vide. Va chasser un peu.</p>
                  )}
                </div>
              </div>
            </div>
            {selectedCreature ? (
              <div className="team-actions">
                <button type="button" onClick={() => setGame((current) => promoteCreatureToLeader(current, selectedCreature.id))}>
                  Mettre meneur
                </button>
                <button type="button" onClick={() => setGame((current) => addCreatureToTeam(current, selectedCreature.id, performance.now()))}>
                  Ajouter a l equipe
                </button>
                <button type="button" onClick={() => setGame((current) => removeCreatureFromTeam(current, selectedCreature.id, performance.now()))}>
                  Retirer de l equipe
                </button>
                <button type="button" onClick={() => setGame((current) => moveCreatureInTeam(current, selectedCreature.id, -1))}>
                  Monter
                </button>
                <button type="button" onClick={() => setGame((current) => moveCreatureInTeam(current, selectedCreature.id, 1))}>
                  Descendre
                </button>
                <button type="button" onClick={() => setGame((current) => closeTeamMenu(current, 'Gestion d equipe bouclee.'))}>
                  Fermer
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}

async function buildAssets(): Promise<LoadedAssets> {
  const [outside, inside, south, playerIdle, playerWalk, brindibouh, galetout, bullefroth] = await Promise.all([
    loadImage(OUTSIDE_MAP_SRC),
    loadImage(INSIDE_MAP_SRC),
    loadImage(SOUTH_MAP_SRC),
    loadImage(PLAYER_IDLE_SRC),
    loadImage(PLAYER_WALK_SRC),
    loadImage(CREATURE_TEMPLATE_SOURCES.brindibouh),
    loadImage(CREATURE_TEMPLATE_SOURCES.galetout),
    loadImage(CREATURE_TEMPLATE_SOURCES.bullefroth),
  ]);

  const playerIdleSheet = removeGreenScreen(playerIdle);
  const playerWalkSheet = removeGreenScreen(playerWalk);
  const baseCreatureAssets: Record<CreatureTemplateId, CreatureAsset> = {
    brindibouh: createTemplateAsset(brindibouh),
    galetout: createTemplateAsset(galetout),
    bullefroth: createTemplateAsset(bullefroth),
  };

  return {
    maps: {
      outside,
      inside,
      south,
      north: createNorthMapCanvas(),
      east: createEastMapCanvas(),
      west: createWestMapCanvas(),
      arena: createArenaMapCanvas(),
    },
    playerIdleSheet,
    playerWalkSheet,
    merchantIdleSheet: shiftSheetHue(playerIdleSheet, 0.08, 0.16, 0.03),
    playerIdleFrames: detectIdleFrames(playerIdleSheet),
    playerWalkFrames: detectWalkFrames(playerWalkSheet),
    creatures: Object.fromEntries(
      Object.values(CREATURE_SPECIES).map((species) => [
        species.id,
        createSpeciesAsset(baseCreatureAssets[species.templateId], species),
      ]),
    ) as Record<CreatureSpeciesId, CreatureAsset>,
  };
}

function createNorthMapCanvas() {
  const canvas = createBaseMapCanvas('#d9f0d1', '#7eb47a');
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  drawRockPatch(context, 0, 0, 220, 170, '#819780');
  drawRockPatch(context, 732, 24, 228, 178, '#718a73');
  drawPath(context, [
    [480, 620],
    [500, 540],
    [480, 470],
    [520, 390],
    [492, 302],
    [520, 176],
  ], '#d2c19a', 54);
  drawShrubCluster(context, 256, 420, '#78a55e');
  drawShrubCluster(context, 612, 388, '#6d9d63');
  drawShrubCluster(context, 780, 470, '#88b26a');
  drawWaterPool(context, 470, 120, 98, 54, '#8fd8f5');
  return canvas;
}

function createEastMapCanvas() {
  const canvas = createBaseMapCanvas('#ecddb6', '#6ab7ca');
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.fillStyle = '#7ad0e1';
  context.fillRect(744, 0, 216, CANVAS_HEIGHT);
  for (let index = 0; index < 14; index += 1) {
    drawWave(context, 768 + index * 12, 70 + index * 36);
  }
  drawPath(context, [
    [42, 324],
    [182, 334],
    [302, 304],
    [438, 326],
    [608, 352],
    [726, 328],
  ], '#dbc78f', 48);
  drawPalm(context, 350, 210);
  drawPalm(context, 610, 258);
  drawPalm(context, 440, 500);
  drawPalm(context, 226, 514);
  return canvas;
}

function createWestMapCanvas() {
  const canvas = createBaseMapCanvas('#cbe1b5', '#4d7247');
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  drawPath(context, [
    [918, 318],
    [758, 328],
    [620, 284],
    [430, 316],
    [270, 352],
    [110, 316],
  ], '#b89f72', 52);
  drawTreeMass(context, 148, 156, '#466d44');
  drawTreeMass(context, 466, 118, '#3f683f');
  drawTreeMass(context, 768, 164, '#4c784d');
  drawTreeMass(context, 306, 470, '#537f4f');
  drawTreeMass(context, 636, 446, '#456a43');
  return canvas;
}

function createArenaMapCanvas() {
  const canvas = createBaseMapCanvas('#e9dcc0', '#8b6b4f');
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.fillStyle = '#5f4330';
  context.fillRect(84, 76, 792, 488);
  context.fillStyle = '#d6bf96';
  context.fillRect(132, 124, 696, 392);
  context.strokeStyle = 'rgba(86, 56, 32, 0.78)';
  context.lineWidth = 12;
  context.strokeRect(132, 124, 696, 392);
  drawPath(
    context,
    [
      [480, 610],
      [480, 520],
      [480, 440],
      [480, 358],
      [480, 284],
      [480, 176],
    ],
    '#f0e2bf',
    42,
  );
  drawRockPatch(context, 136, 128, 120, 94, '#8a6d55');
  drawRockPatch(context, 704, 128, 120, 94, '#8a6d55');
  drawShrubCluster(context, 236, 474, '#708b52');
  drawShrubCluster(context, 716, 474, '#708b52');
  return canvas;
}

function createTemplateAsset(source: HTMLImageElement): CreatureAsset {
  const normalSheet = removeGreenScreen(source);
  return {
    normalSheet,
    shinySheet: shiftSheetHue(normalSheet, 0.42, 0.28, 0.05),
    frames: detectWalkFrames(normalSheet),
  };
}

function createSpeciesAsset(baseAsset: CreatureAsset, species: CreatureSpecies): CreatureAsset {
  const remixedSheet = remixCreatureSheet(baseAsset.normalSheet, baseAsset.frames, species.visualVariant ?? 'none');
  const normalSheet = shiftSheetHue(
    remixedSheet,
    species.hueShift,
    species.saturationBoost,
    species.lightnessBoost,
  );
  return {
    normalSheet,
    shinySheet: shiftSheetHue(
      normalSheet,
      species.shinyHueShift,
      0.22,
      0.08,
    ),
    frames: baseAsset.frames,
  };
}

function renderScene(context: CanvasRenderingContext2D, assets: LoadedAssets, game: GameState) {
  const map = MAPS[game.mapId];
  context.imageSmoothingEnabled = true;
  context.drawImage(assets.maps[game.mapId], 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawMapLabel(context, map.name);

  const drawStack: Array<{ y: number; draw: () => void }> = [];
  const merchant = map.merchant;
  const sanctuary = map.sanctuary;
  const teamStation = map.teamStation;
  const arenaDesk = map.arenaDesk;
  const creatures = game.creaturesByMap[game.mapId];

  if (merchant) {
    drawStack.push({
      y: merchant.y,
      draw: () => drawMerchant(context, assets, merchant),
    });
  }

  if (sanctuary) {
    drawStack.push({
      y: sanctuary.y,
      draw: () => drawSanctuary(context, sanctuary),
    });
  }

  if (teamStation) {
    drawStack.push({
      y: teamStation.y,
      draw: () => drawTeamStation(context, teamStation),
    });
  }

  if (arenaDesk) {
    drawStack.push({
      y: arenaDesk.y,
      draw: () => drawArenaDesk(context, arenaDesk),
    });
  }

  for (const creature of creatures) {
    drawStack.push({
      y: creature.y,
      draw: () => drawCreature(context, assets, creature),
    });
  }

  drawStack.push({
    y: game.player.y,
    draw: () => drawPlayer(context, assets, game.player),
  });

  drawStack.sort((left, right) => left.y - right.y);
  for (const entry of drawStack) {
    entry.draw();
  }

  drawFishingOverlay(context, game);
  drawCanvasHint(context, game);
  drawBattleOverlay(context, assets, game);
  drawCodexOverlay(context, game);
}

function drawMapLabel(context: CanvasRenderingContext2D, label: string) {
  context.fillStyle = 'rgba(27, 38, 18, 0.72)';
  context.fillRect(22, 18, 264, 42);
  context.fillStyle = '#f7f2da';
  context.font = '700 21px Georgia';
  context.fillText(label, 36, 46);
}

function drawPlayer(context: CanvasRenderingContext2D, assets: LoadedAssets, player: PlayerState) {
  drawShadow(context, player.x, player.y, 12, 6, 0.16);
  drawSpriteFrame(
    context,
    assets.playerIdleSheet,
    assets.playerWalkSheet,
    assets.playerIdleFrames,
    assets.playerWalkFrames,
    player,
    PLAYER_TARGET_WIDTH,
    PLAYER_TARGET_HEIGHT,
  );
}

function drawMerchant(context: CanvasRenderingContext2D, assets: LoadedAssets, merchant: Merchant) {
  drawShadow(context, merchant.x, merchant.y, 12, 6, 0.18);
  const frame = assets.playerIdleFrames.down[0];
  const scale = Math.min(70 / frame.height, 54 / frame.width);
  const drawWidth = Math.round(frame.width * scale);
  const drawHeight = Math.round(frame.height * scale);
  context.drawImage(
    assets.merchantIdleSheet,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    merchant.x - drawWidth / 2,
    merchant.y - drawHeight + 10,
    drawWidth,
    drawHeight,
  );

  context.fillStyle = 'rgba(33, 41, 20, 0.78)';
  context.fillRect(merchant.x - 52, merchant.y - 92, 104, 26);
  context.fillStyle = '#fbf6de';
  context.font = '600 15px Georgia';
  context.fillText(merchant.label, merchant.x - 34, merchant.y - 74);
}

function drawSanctuary(context: CanvasRenderingContext2D, sanctuary: Sanctuary) {
  const pulse = 1 + Math.sin(performance.now() / 260) * 0.08;
  drawShadow(context, sanctuary.x, sanctuary.y, 16, 7, 0.16);
  context.save();
  context.fillStyle = 'rgba(198, 243, 255, 0.95)';
  context.beginPath();
  context.arc(sanctuary.x, sanctuary.y - 34, 22 * pulse, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = 'rgba(248, 255, 255, 0.92)';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(sanctuary.x, sanctuary.y - 34, 30 * pulse, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = 'rgba(88, 144, 168, 0.9)';
  context.fillRect(sanctuary.x - 8, sanctuary.y - 18, 16, 36);
  context.restore();

  context.fillStyle = 'rgba(27, 45, 58, 0.82)';
  context.fillRect(sanctuary.x - 60, sanctuary.y - 92, 120, 24);
  context.fillStyle = '#f1fbff';
  context.font = '600 14px Georgia';
  context.fillText(sanctuary.label, sanctuary.x - 42, sanctuary.y - 75);
}

function drawTeamStation(context: CanvasRenderingContext2D, station: InteractionPoint) {
  drawShadow(context, station.x, station.y, 18, 8, 0.16);
  context.fillStyle = 'rgba(111, 77, 47, 0.96)';
  context.fillRect(station.x - 44, station.y - 34, 88, 20);
  context.fillRect(station.x - 30, station.y - 14, 60, 18);
  context.fillStyle = 'rgba(251, 243, 226, 0.95)';
  context.fillRect(station.x - 18, station.y - 42, 36, 10);
  context.fillStyle = 'rgba(33, 29, 20, 0.76)';
  context.fillRect(station.x - 62, station.y - 84, 124, 24);
  context.fillStyle = '#fbf6de';
  context.font = '600 14px Georgia';
  context.fillText(station.label, station.x - 46, station.y - 67);
}

function drawArenaDesk(context: CanvasRenderingContext2D, desk: InteractionPoint) {
  const pulse = 1 + Math.sin(performance.now() / 240) * 0.05;
  drawShadow(context, desk.x, desk.y, 18, 8, 0.18);
  context.fillStyle = 'rgba(92, 58, 34, 0.96)';
  context.fillRect(desk.x - 28, desk.y - 16, 56, 22);
  context.fillStyle = 'rgba(250, 230, 170, 0.82)';
  context.beginPath();
  context.arc(desk.x, desk.y - 24, 18 * pulse, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(37, 25, 17, 0.8)';
  context.fillRect(desk.x - 58, desk.y - 84, 116, 24);
  context.fillStyle = '#fff2d0';
  context.font = '600 14px Georgia';
  context.fillText(desk.label, desk.x - 40, desk.y - 67);
}

function drawCreature(context: CanvasRenderingContext2D, assets: LoadedAssets, creature: CreatureInstance) {
  const asset = assets.creatures[creature.speciesId];
  const species = CREATURE_SPECIES[creature.speciesId];
  const frames = asset.frames[creature.facing];
  const frameIndex = creature.moving ? Math.floor(performance.now() / 150) % frames.length : 1;
  const frame = frames[frameIndex];
  const sheet = creature.shiny ? asset.shinySheet : asset.normalSheet;
  const scale =
    Math.min(CREATURE_TARGET_HEIGHT / frame.height, CREATURE_TARGET_WIDTH / frame.width) * (species.sizeScale ?? 1);
  const drawWidth = Math.round(frame.width * scale);
  const drawHeight = Math.round(frame.height * scale);

  drawShadow(context, creature.x, creature.y, 11, 5, 0.14);
  context.drawImage(
    sheet,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    creature.x - drawWidth / 2,
    creature.y - drawHeight + 12,
    drawWidth,
    drawHeight,
  );

  if (creature.shiny) {
    context.fillStyle = '#ffe07a';
    context.beginPath();
    context.arc(creature.x + 18, creature.y - 48, 4, 0, Math.PI * 2);
    context.fill();
  }
}

function drawSpriteFrame(
  context: CanvasRenderingContext2D,
  idleSheet: HTMLCanvasElement,
  walkSheet: HTMLCanvasElement,
  idleFrames: FrameMap,
  walkFrames: FrameMap,
  player: PlayerState,
  targetWidth: number,
  targetHeight: number,
) {
  const sourceFrames = player.moving ? walkFrames[player.facing] : idleFrames[player.facing];
  const frameIndex = player.moving ? Math.floor(performance.now() / 120) % sourceFrames.length : 0;
  const frame = sourceFrames[frameIndex];
  const image = player.moving ? walkSheet : idleSheet;
  const scale = Math.min(targetHeight / frame.height, targetWidth / frame.width);
  const drawWidth = Math.round(frame.width * scale);
  const drawHeight = Math.round(frame.height * scale);

  context.drawImage(
    image,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    player.x - drawWidth / 2,
    player.y - drawHeight + 10,
    drawWidth,
    drawHeight,
  );
}

function drawShadow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  alpha: number,
) {
  context.fillStyle = `rgba(20, 28, 18, ${alpha})`;
  context.beginPath();
  context.ellipse(x, y + 4, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
}

function drawFishingOverlay(context: CanvasRenderingContext2D, game: GameState) {
  if (game.fishing.phase === 'idle') return;

  const hand = getRodHand(game.player);
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = '#4f2f12';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(hand.x, hand.y);
  context.lineTo(hand.x + (game.player.facing === 'left' ? -18 : game.player.facing === 'right' ? 18 : 10), hand.y - 22);
  context.stroke();

  context.strokeStyle = 'rgba(248, 248, 255, 0.92)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(hand.x, hand.y - 18);
  context.lineTo(game.fishing.bobberX, game.fishing.bobberY);
  context.stroke();

  const pulse = 1 + Math.sin(performance.now() / 160) * 0.14;
  context.fillStyle = game.fishing.phase === 'reeling' ? '#ffd36b' : '#ff6363';
  context.beginPath();
  context.arc(game.fishing.bobberX, game.fishing.bobberY, 5 * pulse, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(255,255,255,0.45)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(game.fishing.bobberX, game.fishing.bobberY, 10 * pulse, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawCanvasHint(context: CanvasRenderingContext2D, game: GameState) {
  const hint = getActionHint(game);
  if (!hint) return;

  context.fillStyle = 'rgba(17, 27, 11, 0.76)';
  context.fillRect(284, 22, 392, 38);
  context.fillStyle = '#f7f2da';
  context.font = '600 18px Georgia';
  context.fillText(hint, 304, 47);
}

function drawBattleOverlay(context: CanvasRenderingContext2D, assets: LoadedAssets, game: GameState) {
  if (game.battle.phase === 'idle') return;

  const ally = game.battle.allyTeam[game.battle.allyIndex];
  const foe = game.battle.foeTeam[game.battle.foeIndex];
  const allyVigor = game.battle.allyVigors[ally.id] ?? 0;
  const allyMaxVigor = computeVigor(ally);
  const foeVigor = game.battle.foeVigors[foe.id] ?? 0;
  const foeMaxVigor = computeVigor(foe);
  const log = game.battle.log;
  const allyAsset = assets.creatures[ally.speciesId];
  const wildAsset = assets.creatures[foe.speciesId];
  const allyFrame = allyAsset.frames.left[1];
  const wildFrame = wildAsset.frames.right[1];
  const allySheet = ally.shiny ? allyAsset.shinySheet : allyAsset.normalSheet;
  const wildSheet = foe.shiny ? wildAsset.shinySheet : wildAsset.normalSheet;
  const allySpecies = CREATURE_SPECIES[ally.speciesId];
  const wildSpecies = CREATURE_SPECIES[foe.speciesId];

  context.save();
  context.fillStyle = 'rgba(10, 18, 10, 0.58)';
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = 'rgba(244, 236, 208, 0.96)';
  context.fillRect(72, 78, CANVAS_WIDTH - 144, CANVAS_HEIGHT - 156);
  context.strokeStyle = 'rgba(71, 94, 46, 0.6)';
  context.lineWidth = 3;
  context.strokeRect(72, 78, CANVAS_WIDTH - 144, CANVAS_HEIGHT - 156);

  context.fillStyle = '#27411f';
  context.font = '700 30px Georgia';
  context.fillText(game.battle.title, 106, 126);

  drawBattleCreatureCard(
    context,
    ally.speciesName,
    ally.iv,
    allyVigor,
    allyMaxVigor,
    114,
    174,
    false,
    allySpecies.evolvesTo ? ally.victories : null,
  );
  drawBattleCreatureCard(
    context,
    `${foe.shiny ? 'Shiny ' : ''}${wildSpecies.name}`,
    foe.iv,
    foeVigor,
    foeMaxVigor,
    518,
    174,
    true,
    null,
  );

  const allyBattleSize = Math.round(144 * (allySpecies.sizeScale ?? 1));
  const wildBattleSize = Math.round(144 * (wildSpecies.sizeScale ?? 1));
  context.drawImage(allySheet, allyFrame.x, allyFrame.y, allyFrame.width, allyFrame.height, 132, 264, allyBattleSize, allyBattleSize);
  context.drawImage(wildSheet, wildFrame.x, wildFrame.y, wildFrame.width, wildFrame.height, 636, 214, wildBattleSize, wildBattleSize);

  context.fillStyle = '#324926';
  context.font = '600 18px Georgia';
  context.fillText(log, 108, 430);
  context.fillText('1 Frappe', 108, 474);
  context.fillText(game.battle.mode === 'wild' ? '2 Sceau' : '2 Focus', 248, 474);
  context.fillText('3 Repli', 392, 474);
  context.fillText(
    `${game.battle.allyIndex + 1}/${game.battle.allyTeam.length} allies actifs | ${game.battle.foeIndex + 1}/${game.battle.foeTeam.length} adversaires`,
    108,
    514,
  );
  context.restore();
}

function drawCodexOverlay(context: CanvasRenderingContext2D, game: GameState) {
  if (!game.codexOpen) return;

  const visibleEntries = Object.values(CREATURE_SPECIES)
    .filter((species) => game.seenSpecies.includes(species.id))
    .slice(0, 12);

  context.save();
  context.fillStyle = 'rgba(8, 16, 14, 0.68)';
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.fillStyle = 'rgba(247, 244, 228, 0.97)';
  context.fillRect(88, 62, CANVAS_WIDTH - 176, CANVAS_HEIGHT - 124);
  context.strokeStyle = 'rgba(65, 92, 72, 0.6)';
  context.lineWidth = 3;
  context.strokeRect(88, 62, CANVAS_WIDTH - 176, CANVAS_HEIGHT - 124);
  context.fillStyle = '#243c2e';
  context.font = '700 28px Georgia';
  context.fillText('Codex des echos', 120, 106);
  context.font = '600 17px Georgia';
  context.fillText(`${game.seenSpecies.length} apercues | ${game.capturedCreatures.length} liees | touche C pour fermer`, 120, 134);

  let row = 0;
  for (const species of visibleEntries) {
    const capturedCount = game.capturedCreatures.filter((creature) => creature.speciesId === species.id).length;
    const x = row < 6 ? 122 : 456;
    const y = 182 + (row % 6) * 58;
    context.fillStyle = 'rgba(232, 240, 226, 0.92)';
    context.fillRect(x, y, 286, 42);
    context.fillStyle = '#29422d';
    context.font = '700 16px Georgia';
    context.fillText(species.name, x + 12, y + 18);
    context.font = '500 13px Georgia';
    context.fillText(`${species.types.join('/')} | ${species.rarity}`, x + 12, y + 35);
    context.fillText(capturedCount > 0 ? `Lies: ${capturedCount}` : 'Seulement apercue', x + 196, y + 35);
    row += 1;
  }

  context.restore();
}

function drawBattleCreatureCard(
  context: CanvasRenderingContext2D,
  label: string,
  iv: number,
  vigor: number,
  maxVigor: number,
  x: number,
  y: number,
  alignRight: boolean,
  victories: number | null,
) {
  context.fillStyle = 'rgba(255, 249, 232, 0.96)';
  context.fillRect(x, y, 280, 74);
  context.strokeStyle = 'rgba(116, 137, 79, 0.42)';
  context.strokeRect(x, y, 280, 74);
  context.fillStyle = '#2f4824';
  context.font = '700 20px Georgia';
  context.fillText(label, x + 16, y + 26);
  context.font = '600 15px Georgia';
  context.fillText(`${iv}% IV`, alignRight ? x + 210 : x + 16, y + 48);
  if (victories !== null) {
    context.fillText(`Ascension ${Math.min(victories, EVOLUTION_VICTORIES_REQUIRED)}/${EVOLUTION_VICTORIES_REQUIRED}`, x + 96, y + 48);
  }
  drawVigorBar(context, x + 16, y + 54, 248, vigor, maxVigor);
}

function drawVigorBar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  value: number,
  maxValue: number,
) {
  const ratio = maxValue <= 0 ? 0 : clamp01(value / maxValue);
  context.fillStyle = 'rgba(45, 59, 34, 0.18)';
  context.fillRect(x, y, width, 12);
  context.fillStyle = ratio > 0.55 ? '#6eaf53' : ratio > 0.25 ? '#d7b34e' : '#d76a54';
  context.fillRect(x, y, Math.max(0, width * ratio), 12);
}

function drawLoadingState(context: CanvasRenderingContext2D, error: string | null) {
  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#f7f0ce');
  gradient.addColorStop(1, '#c2e59c');
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = '#294126';
  context.font = '700 28px Georgia';
  context.fillText(error ? 'Chargement rate' : 'Chargement des nouveaux assets...', 52, 84);

  if (error) {
    context.font = '400 18px Georgia';
    context.fillText(error, 52, 122);
  }
}

function advanceGameState(
  current: GameState,
  timestamp: number,
  bufferedDirection: Direction | null,
  heldDirection: Direction | null,
): GameState {
  let next = current;

  if (next.notice && next.notice.expiresAt <= timestamp) {
    next = { ...next, notice: null };
  }

  if (next.teamMenuOpen) {
    return next;
  }

  if (next.battle.phase !== 'idle') {
    return next;
  }

  next = advanceFishing(next, timestamp);
  next = advanceCreatures(next, timestamp);
  next = advancePlayerMovement(next, timestamp, bufferedDirection, heldDirection);
  next = applyTrigger(next, timestamp);

  return next;
}

function advancePlayerMovement(
  current: GameState,
  timestamp: number,
  bufferedDirection: Direction | null,
  heldDirection: Direction | null,
): GameState {
  const map = MAPS[current.mapId];
  const player = current.player;

  if (!player.moving) {
    if (current.fishing.phase !== 'idle') {
      return current;
    }

    const nextDirection = bufferedDirection ?? heldDirection;
    if (!nextDirection) return current;
    const nextMove = directionToMove(nextDirection);
    if (!nextMove) return current;

    const moved = attemptPlayerMove(player, nextMove, timestamp, map.colliders);
    return moved === player ? current : { ...current, player: moved };
  }

  const progress = Math.min((timestamp - player.moveStartedAt) / STEP_MS, 1);
  if (progress < 1) {
    return {
      ...current,
      player: {
        ...player,
        x: lerp(player.startX, player.targetX, progress),
        y: lerp(player.startY, player.targetY, progress),
      },
    };
  }

  const settled: PlayerState = {
    ...player,
    x: player.targetX,
    y: player.targetY,
    startX: player.targetX,
    startY: player.targetY,
    moving: false,
  };

  if (current.fishing.phase !== 'idle') {
    return { ...current, player: settled };
  }

  const nextDirection = bufferedDirection ?? heldDirection;
  if (!nextDirection) {
    return { ...current, player: settled };
  }

  const nextMove = directionToMove(nextDirection);
  if (!nextMove) {
    return { ...current, player: settled };
  }

  const moved = attemptPlayerMove(settled, nextMove, timestamp, map.colliders);
  return { ...current, player: moved };
}

function advanceCreatures(current: GameState, timestamp: number): GameState {
  let changed = false;
  const nextByMap = Object.fromEntries(
    Object.entries(current.creaturesByMap).map(([mapId, creatures]) => {
      const typedMapId = mapId as MapId;
      const updatedCreatures = creatures.map((creature) => {
        if (creature.moving) {
          const progress = Math.min((timestamp - creature.moveStartedAt) / CREATURE_STEP_MS, 1);
          if (progress < 1) {
            changed = true;
            return {
              ...creature,
              x: lerp(creature.startX, creature.targetX, progress),
              y: lerp(creature.startY, creature.targetY, progress),
            };
          }

          changed = true;
          return {
            ...creature,
            x: creature.targetX,
            y: creature.targetY,
            startX: creature.targetX,
            startY: creature.targetY,
            moving: false,
            lastDecisionAt: timestamp,
          };
        }

        if (timestamp - creature.lastDecisionAt < 900 + (creature.id % 3) * 220) {
          return creature;
        }

        const choices: Array<MoveIntent | null> = [
          { dx: 0, dy: -1, facing: 'up' },
          { dx: 0, dy: 1, facing: 'down' },
          { dx: -1, dy: 0, facing: 'left' },
          { dx: 1, dy: 0, facing: 'right' },
          null,
        ];
        const choice = choices[Math.floor(Math.random() * choices.length)];
        if (!choice) {
          changed = true;
          return {
            ...creature,
            lastDecisionAt: timestamp,
          };
        }

        changed = true;
        return attemptCreatureMove(creature, choice, timestamp, MAPS[typedMapId].colliders);
      });

      return [typedMapId, updatedCreatures];
    }),
  ) as CreaturesByMap;

  if (!changed) return current;

  return {
    ...current,
    creaturesByMap: nextByMap,
  };
}

function advanceFishing(current: GameState, timestamp: number): GameState {
  if (current.fishing.phase === 'idle') return current;

  if (current.fishing.phase === 'casting' && timestamp >= current.fishing.startedAt + 420) {
    return {
      ...current,
      fishing: {
        ...current.fishing,
        phase: 'waiting',
      },
      notice: {
        text: 'La ligne flotte. Le lac decide quand il est d humeur.',
        tone: 'info',
        expiresAt: timestamp + 1400,
      },
    };
  }

  if (current.fishing.phase === 'waiting' && timestamp >= current.fishing.resolveAt) {
    const caught = rollFish();
    return {
      ...current,
      fishInventory: [caught, ...current.fishInventory].slice(0, 24),
      fishing: {
        ...current.fishing,
        phase: 'reeling',
        startedAt: timestamp,
        resolveAt: timestamp + 1400,
        result: caught,
      },
      notice: {
        text: `${caught.species} attrapee: ${caught.sizeCm} cm, ${caught.rarity.toLowerCase()}.`,
        tone: 'success',
        expiresAt: timestamp + 2600,
      },
    };
  }

  if (current.fishing.phase === 'reeling' && timestamp >= current.fishing.resolveAt) {
    return {
      ...current,
      fishing: { phase: 'idle' },
    };
  }

  return current;
}

function applyTrigger(current: GameState, timestamp: number): GameState {
  if (current.player.moving || current.fishing.phase !== 'idle') return current;

  const trigger = findTrigger(MAPS[current.mapId], current.player);
  if (!trigger) return current;

  return {
    ...current,
    mapId: trigger.targetMap,
    player: {
      x: trigger.targetX,
      y: trigger.targetY,
      startX: trigger.targetX,
      startY: trigger.targetY,
      targetX: trigger.targetX,
      targetY: trigger.targetY,
      moving: false,
      moveStartedAt: timestamp,
      facing: trigger.targetFacing,
    },
    fishing: { phase: 'idle' },
    notice: {
      text: getTriggerNotice(trigger),
      tone: 'info',
      expiresAt: timestamp + 1800,
    },
  };
}

function getTriggerNotice(trigger: MapTrigger) {
  if (trigger.kind === 'door') {
    return trigger.targetMap === 'inside' ? 'Tu entres dans la maison.' : 'Retour dehors.';
  }

  switch (trigger.targetMap) {
    case 'south':
      return 'Tu descends vers la route sauvage.';
    case 'north':
      return 'Tu grimpes vers la crete nord.';
    case 'east':
      return 'Tu longes la cote de nacre.';
    case 'west':
      return 'Tu t enfonces dans les bois.';
    case 'arena':
      return 'Tu penetres dans l arene des echos.';
    default:
      return 'Retour au village.';
  }
}

function handlePrimaryAction(current: GameState, timestamp: number): GameState {
  if (current.player.moving) return current;
  if (current.battle.phase !== 'idle') return current;
  if (current.teamMenuOpen) {
    return closeTeamMenu(current, 'Table des liens refermee.');
  }

  const sanctuary = findNearbySanctuary(MAPS[current.mapId], current.player);
  if (sanctuary) {
    return restoreCapturedCreatures(current, sanctuary, timestamp);
  }

  const teamStation = findNearbyTeamStation(MAPS[current.mapId], current.player);
  if (teamStation) {
    return openTeamMenu(current, timestamp, teamStation);
  }

  const arenaDesk = findNearbyArenaDesk(MAPS[current.mapId], current.player);
  if (arenaDesk) {
    return startArenaBattle(current, timestamp, arenaDesk);
  }

  const merchant = findNearbyMerchant(MAPS[current.mapId], current.player);
  if (merchant) {
    return sellFishInventory(current, merchant, timestamp);
  }

  if (current.fishing.phase !== 'idle') {
    return {
      ...current,
      notice: {
        text: 'Patiente, ta ligne travaille deja.',
        tone: 'info',
        expiresAt: timestamp + 1500,
      },
    };
  }

  const creature = findNearbyCreature(current);
  if (creature) {
    return startBattle(current, creature, timestamp);
  }

  const spot = findFishingSpot(MAPS[current.mapId], current.player);
  if (spot) {
    return startFishing(current, spot, timestamp);
  }

  return {
    ...current,
    notice: {
      text:
        current.mapId === 'south'
          ? 'Les creatures ne vont pas sauter dans tes bras. Approche-toi.'
          : current.mapId === 'inside'
            ? 'La table des liens au centre sert a choisir ton equipe.'
            : current.mapId === 'arena'
              ? 'Approche de la dalle du duel si tu veux prendre une rouste ou une couronne.'
          : current.mapId === 'outside'
            ? 'Essaie pres du marchand, du lac ou du chemin du bas.'
            : 'Ici, il n y a rien a activer pour l instant.',
      tone: 'info',
      expiresAt: timestamp + 1800,
    },
  };
}

function sellFishInventory(current: GameState, merchant: Merchant, timestamp: number): GameState {
  if (current.fishInventory.length === 0) {
    return {
      ...current,
      notice: {
        text: `${merchant.label}: reviens avec du poisson, pas avec du vent.`,
        tone: 'info',
        expiresAt: timestamp + 1800,
      },
    };
  }

  const payout = Number(getFishInventoryValue(current.fishInventory).toFixed(1));
  return {
    ...current,
    fishInventory: [],
    gold: Number((current.gold + payout).toFixed(1)),
    notice: {
      text: `${merchant.label}: ${payout.toFixed(1)} pieces pour tout le poisson. Marche honnete, pour une fois.`,
      tone: 'success',
      expiresAt: timestamp + 2400,
    },
  };
}

function restoreCapturedCreatures(current: GameState, sanctuary: Sanctuary, timestamp: number): GameState {
  if (current.capturedCreatures.length === 0) {
    return {
      ...current,
      notice: {
        text: `${sanctuary.label}: commence par te lier a une creature.`,
        tone: 'info',
        expiresAt: timestamp + 1800,
      },
    };
  }

  return {
    ...current,
    notice: {
      text: `${sanctuary.label}: toute ton equipe retrouve sa vigueur. Propre, net, sans facture.`,
      tone: 'success',
      expiresAt: timestamp + 2200,
    },
  };
}

function startBattle(current: GameState, creature: CreatureInstance, timestamp: number): GameState {
  const allyTeam = getActiveTeam(current);
  if (allyTeam.length === 0) {
    return {
      ...current,
      notice: {
        text: 'Il te faut au moins une creature liee pour engager un affrontement.',
        tone: 'info',
        expiresAt: timestamp + 2200,
      },
    };
  }

  return {
    ...current,
    seenSpecies: addSeenSpecies(current.seenSpecies, creature.speciesId),
    battle: createBattleState(
      'wild',
      `Affrontement sauvage`,
      allyTeam,
      [createCapturedFromWild(creature)],
      `${allyTeam[0].speciesName} entre en resonance avec ${CREATURE_SPECIES[creature.speciesId].name}.`,
      0,
      creature,
    ),
    notice: {
      text: 'Affrontement lance. Utilise 1, 2 ou 3.',
      tone: 'info',
      expiresAt: timestamp + 1800,
    },
  };
}

function handleBattleInput(current: GameState, key: string, timestamp: number): GameState {
  if (current.battle.phase === 'idle') return current;

  const actionByKey: Record<string, BattleAction> = {
    '1': 'frappe',
    '2': 'sceau',
    '3': 'repli',
  };
  const action = actionByKey[key];
  if (!action) return current;

  return resolveBattleAction(current, action, timestamp);
}

function resolveBattleAction(current: GameState, action: BattleAction, timestamp: number): GameState {
  if (current.battle.phase === 'idle') return current;
  const battle = current.battle;
  const ally = battle.allyTeam[battle.allyIndex];
  const foe = battle.foeTeam[battle.foeIndex];
  const foeSpecies = CREATURE_SPECIES[foe.speciesId];
  const allyPower = computeBattleDamage(ally, foe);
  const foePower = computeBattleDamage(foe, ally);
  const allyEffect = describeEffectiveness(ally, foe);
  const foeEffect = describeEffectiveness(foe, ally);

  if (action === 'repli') {
    if (Math.random() < 0.82) {
      return {
        ...current,
        battle: { phase: 'idle' },
        notice: {
          text: 'Repli propre. Tu coupes la resonance et tu files.',
          tone: 'info',
          expiresAt: timestamp + 1800,
        },
      };
    }

    return applyWildCounter(
      current,
      `Le repli rate. ${foeSpecies.name} te lit comme un livre ouvert.`,
      foePower,
      foeEffect,
      timestamp,
    );
  }

  if (action === 'sceau') {
    if (battle.mode !== 'wild' || !battle.sourceWild) {
      return applyWildCounter(
        current,
        `${ally.speciesName} se concentre, serre les crocs et gagne l initiative.`,
        Math.max(4, Math.round(foePower * 0.75)),
        foeEffect,
        timestamp,
      );
    }

    const captureChance = computeSealChance(
      battle.foeVigors[foe.id] ?? 0,
      computeVigor(foe),
      battle.sourceWild,
    );
    if (Math.random() < captureChance) {
      return captureCreature(current, battle.sourceWild, timestamp, `Sceau reussi sur ${foeSpecies.name}.`);
    }

    return applyWildCounter(
      current,
      `Le sceau craque. ${foeSpecies.name} refuse encore le lien.`,
      foePower,
      foeEffect,
      timestamp,
    );
  }

  const nextFoeVigor = Math.max(0, (battle.foeVigors[foe.id] ?? 0) - allyPower);
  if (nextFoeVigor <= 0) {
    const battleAfterHit: BattleState =
      battle.mode === 'wild' && battle.sourceWild
        ? battle
        : {
            ...battle,
            foeVigors: {
              ...battle.foeVigors,
              [foe.id]: 0,
            },
          };

    if (battle.mode === 'wild' && battle.sourceWild) {
      const replacement = createEncounter(battle.sourceWild.mapId, battle.sourceWild.slotId, battle.sourceWild.roamBounds);
      const ascension = grantVictoryToLeader(current.capturedCreatures, ally.id);
      const nextTeamIds = syncTeamIds(current.teamIds, ascension.creatures);
      return {
        ...current,
        creaturesByMap: {
          ...current.creaturesByMap,
          [battle.sourceWild.mapId]: current.creaturesByMap[battle.sourceWild.mapId].map((entry) =>
            entry.id === battle.sourceWild?.id ? replacement : entry,
          ),
        },
        capturedCreatures: ascension.creatures,
        teamIds: nextTeamIds,
        battle: { phase: 'idle' },
        seenSpecies: addSeenSpecies(current.seenSpecies, replacement.speciesId),
        notice: {
          text: `${ally.speciesName} remporte le duel. ${foeSpecies.name} s eparpille dans les fourres.${ascension.notice ? ` ${ascension.notice}` : ''}`,
          tone: 'success',
          expiresAt: timestamp + 2200,
        },
      };
    }

    return advanceArenaAfterFoeDown(current, battleAfterHit, ally, foe, timestamp);
  }

  return applyWildCounter(
    {
      ...current,
      battle: {
        ...battle,
        foeVigors: {
          ...battle.foeVigors,
          [foe.id]: nextFoeVigor,
        },
        log: `${ally.speciesName} frappe. ${foeSpecies.name} vacille.${allyEffect}`,
      },
    },
    `${ally.speciesName} frappe. ${foeSpecies.name} reste debout.${allyEffect}`,
    foePower,
    foeEffect,
    timestamp,
  );
}

function applyWildCounter(
  current: GameState,
  introLog: string,
  damage: number,
  effectNote: string,
  timestamp: number,
): GameState {
  if (current.battle.phase === 'idle') return current;
  const battle = current.battle;
  const ally = battle.allyTeam[battle.allyIndex];
  const foe = battle.foeTeam[battle.foeIndex];
  const nextAllyVigor = Math.max(0, (battle.allyVigors[ally.id] ?? 0) - damage);
  const foeSpecies = CREATURE_SPECIES[foe.speciesId];

  if (nextAllyVigor <= 0) {
    const defeatedBattle: BattleState = {
      ...battle,
      allyVigors: {
        ...battle.allyVigors,
        [ally.id]: 0,
      },
    };

    const nextAllyIndex = findNextAvailableIndex(battle.allyTeam, defeatedBattle.allyVigors, battle.allyIndex);
    if (nextAllyIndex === -1) {
      return {
        ...current,
        battle: { phase: 'idle' },
        notice: {
          text:
            battle.mode === 'arena'
              ? `${introLog} ${foeSpecies.name} plie toute ton equipe. L arene te renvoie a tes gammes.`
              : `${introLog} ${foeSpecies.name} brise la resonance. Duel perdu.`,
          tone: 'info',
          expiresAt: timestamp + 2400,
        },
      };
    }

    const nextAlly = battle.allyTeam[nextAllyIndex];
    return {
      ...current,
      battle: {
        ...defeatedBattle,
        allyIndex: nextAllyIndex,
        log: `${introLog} ${ally.speciesName} tombe. ${nextAlly.speciesName} prend le relais.${effectNote}`,
      },
    };
  }

  return {
    ...current,
    battle: {
      ...battle,
      allyVigors: {
        ...battle.allyVigors,
        [ally.id]: nextAllyVigor,
      },
      log: `${introLog} ${foeSpecies.name} contre-attaque pour ${damage} vigueur.${effectNote}`,
    },
  };
}

function captureCreature(current: GameState, creature: CreatureInstance, timestamp: number, prefix?: string): GameState {
  const species = CREATURE_SPECIES[creature.speciesId];
  const ascension =
    current.battle.phase === 'idle'
      ? { creatures: current.capturedCreatures, notice: '' }
      : grantVictoryToLeader(current.capturedCreatures, current.battle.allyTeam[current.battle.allyIndex].id);
  const captured: CapturedCreature = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    speciesId: creature.speciesId,
    speciesName: species.name,
    shiny: creature.shiny,
    iv: creature.iv,
    victories: 0,
  };
  const replacement = createEncounter(creature.mapId, creature.slotId, creature.roamBounds);
  const nextCreatures = [captured, ...ascension.creatures].slice(0, 30);
  const nextTeamIds =
    current.teamIds.length < 6 ? syncTeamIds([...current.teamIds, captured.id], nextCreatures) : syncTeamIds(current.teamIds, nextCreatures);

  return {
    ...current,
    creaturesByMap: {
      ...current.creaturesByMap,
      [creature.mapId]: current.creaturesByMap[creature.mapId].map((entry) => (entry.id === creature.id ? replacement : entry)),
    },
    capturedCreatures: nextCreatures,
    teamIds: nextTeamIds,
    battle: { phase: 'idle' },
    seenSpecies: addSeenSpecies(addSeenSpecies(current.seenSpecies, creature.speciesId), replacement.speciesId),
    notice: {
      text: `${prefix ? `${prefix} ` : ''}${creature.shiny ? 'Shiny ' : ''}${species.name} capture${creature.shiny ? 'e' : ''}: ${species.types.join('/')} ${creature.iv}% IV, rarete ${species.rarity.toLowerCase()}.${current.teamIds.length < 6 ? ' Elle rejoint directement l equipe.' : ' Elle file dans la reserve.'}${ascension.notice ? ` ${ascension.notice}` : ''}`,
      tone: 'success',
      expiresAt: timestamp + 2600,
    },
    selectedCreatureId: captured.id,
  };
}

function addSeenSpecies(seenSpecies: CreatureSpeciesId[], speciesId: CreatureSpeciesId) {
  return seenSpecies.includes(speciesId) ? seenSpecies : [...seenSpecies, speciesId];
}

function startFishing(current: GameState, spot: FishingSpot, timestamp: number): GameState {
  const waitDuration = 2200 + Math.random() * 2400;
  return {
    ...current,
    player: {
      ...current.player,
      facing: spot.facing,
    },
    fishing: {
      phase: 'casting',
      startedAt: timestamp,
      resolveAt: timestamp + 420 + waitDuration,
      spotId: spot.id,
      bobberX: spot.x + spot.bobberOffsetX,
      bobberY: spot.y + spot.bobberOffsetY,
      result: null,
    },
    notice: {
      text: `${spot.label}: lancer de ligne...`,
      tone: 'info',
      expiresAt: timestamp + 1400,
    },
  };
}

function attemptPlayerMove(player: PlayerState, move: MoveIntent, timestamp: number, colliders: Rect[]): PlayerState {
  const step = 34;
  const nextX = clamp(player.x + move.dx * step, 42, CANVAS_WIDTH - 42);
  const nextY = clamp(player.y + move.dy * step, 58, CANVAS_HEIGHT - 20);
  const body = {
    x: nextX - PLAYER_BODY_WIDTH / 2,
    y: nextY - 28,
    width: PLAYER_BODY_WIDTH,
    height: PLAYER_BODY_HEIGHT,
  };

  if (colliders.some((collider) => intersects(body, collider))) {
    return player.facing === move.facing ? player : { ...player, facing: move.facing };
  }

  return {
    ...player,
    facing: move.facing,
    startX: player.x,
    startY: player.y,
    targetX: nextX,
    targetY: nextY,
    moving: true,
    moveStartedAt: timestamp,
  };
}

function attemptCreatureMove(
  creature: CreatureInstance,
  move: MoveIntent,
  timestamp: number,
  colliders: Rect[],
): CreatureInstance {
  const step = 22;
  const nextX = clamp(
    creature.x + move.dx * step,
    creature.roamBounds.x + 18,
    creature.roamBounds.x + creature.roamBounds.width - 18,
  );
  const nextY = clamp(
    creature.y + move.dy * step,
    creature.roamBounds.y + 18,
    creature.roamBounds.y + creature.roamBounds.height - 18,
  );
  const body = {
    x: nextX - CREATURE_BODY_WIDTH / 2,
    y: nextY - 24,
    width: CREATURE_BODY_WIDTH,
    height: CREATURE_BODY_HEIGHT,
  };

  if (colliders.some((collider) => intersects(body, collider))) {
    return {
      ...creature,
      facing: move.facing,
      lastDecisionAt: timestamp,
    };
  }

  return {
    ...creature,
    facing: move.facing,
    startX: creature.x,
    startY: creature.y,
    targetX: nextX,
    targetY: nextY,
    moving: true,
    moveStartedAt: timestamp,
    lastDecisionAt: timestamp,
  };
}

function detectIdleFrames(sheet: HTMLCanvasElement): FrameMap {
  const boxes = detectSpriteBounds(sheet);
  if (boxes.length < 4) {
    throw new Error('Idle sheet incomplete.');
  }

  return {
    down: [boxes[0]],
    up: [boxes[1]],
    left: [boxes[2]],
    right: [boxes[3]],
  };
}

function detectWalkFrames(sheet: HTMLCanvasElement): FrameMap {
  const boxes = detectSpriteBounds(sheet);
  if (boxes.length < 12) {
    throw new Error('Walk sheet incomplete.');
  }

  return {
    down: boxes.slice(0, 3),
    left: boxes.slice(3, 6),
    right: boxes.slice(6, 9),
    up: boxes.slice(9, 12),
  };
}

function detectSpriteBounds(sheet: HTMLCanvasElement) {
  const context = sheet.getContext('2d');
  if (!context) {
    throw new Error('Canvas inaccessible.');
  }

  const { width, height } = sheet;
  const imageData = context.getImageData(0, 0, width, height);
  const visited = new Uint8Array(width * height);
  const boxes: Rect[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (visited[index] || !isOpaquePixel(imageData.data, index * 4)) continue;

      const stack = [index];
      visited[index] = 1;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let pixelCount = 0;

      while (stack.length > 0) {
        const current = stack.pop();
        if (current === undefined) continue;

        const currentX = current % width;
        const currentY = Math.floor(current / width);
        pixelCount += 1;
        minX = Math.min(minX, currentX);
        maxX = Math.max(maxX, currentX);
        minY = Math.min(minY, currentY);
        maxY = Math.max(maxY, currentY);

        for (const [offsetX, offsetY] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nextX = currentX + offsetX;
          const nextY = currentY + offsetY;
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;

          const nextIndex = nextY * width + nextX;
          if (visited[nextIndex] || !isOpaquePixel(imageData.data, nextIndex * 4)) continue;
          visited[nextIndex] = 1;
          stack.push(nextIndex);
        }
      }

      if (pixelCount > 450) {
        boxes.push({
          x: Math.max(minX - 8, 0),
          y: Math.max(minY - 8, 0),
          width: Math.min(maxX - minX + 17, width - Math.max(minX - 8, 0)),
          height: Math.min(maxY - minY + 17, height - Math.max(minY - 8, 0)),
        });
      }
    }
  }

  return boxes.sort((left, right) => {
    const rowDelta = left.y - right.y;
    return Math.abs(rowDelta) > 40 ? rowDelta : left.x - right.x;
  });
}

function removeGreenScreen(source: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  context.drawImage(source, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    if (green > 210 && red < 110 && blue < 110) {
      data[index + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function shiftSheetHue(source: HTMLCanvasElement, hueDelta: number, satBoost: number, lightBoost: number) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  context.drawImage(source, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    const [h, s, l] = rgbToHsl(data[index], data[index + 1], data[index + 2]);
    const [red, green, blue] = hslToRgb(
      normalizeHue(h + hueDelta),
      clamp01(s + satBoost),
      clamp01(l + lightBoost),
    );
    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function remixCreatureSheet(source: HTMLCanvasElement, frames: FrameMap, variant: CreatureVisualVariant) {
  if (variant === 'none') return source;

  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  if (!context) return source;

  context.drawImage(source, 0, 0);
  for (const direction of ['down', 'left', 'right', 'up'] as const) {
    for (const frame of frames[direction]) {
      drawVariantAccent(context, frame, direction, variant);
    }
  }

  return canvas;
}

function drawVariantAccent(
  context: CanvasRenderingContext2D,
  frame: Rect,
  direction: Direction,
  variant: CreatureVisualVariant,
) {
  const centerX = frame.x + frame.width / 2;
  const centerY = frame.y + frame.height / 2;
  const leftX = frame.x + 8;
  const rightX = frame.x + frame.width - 8;
  const topY = frame.y + 10;
  const midY = centerY + 2;
  const bottomY = frame.y + frame.height - 10;
  const lookLeft = direction === 'left';
  const lookRight = direction === 'right';
  const wingShift = lookLeft ? -6 : lookRight ? 6 : 0;

  context.save();
  switch (variant) {
    case 'ramureine':
      fillLeaf(context, centerX - 10, topY + 6, 8, 14, '#6fae57', -0.6);
      fillLeaf(context, centerX + 10, topY + 6, 8, 14, '#7ebc5f', 0.6);
      fillLeaf(context, centerX, topY - 2, 7, 12, '#cde789', 0);
      break;
    case 'floramuse':
      fillPetal(context, centerX, topY + 4, 14, '#f7c1d8');
      fillLeaf(context, centerX - 14, midY + 8, 9, 16, '#70b56a', -0.8);
      fillLeaf(context, centerX + 14, midY + 8, 9, 16, '#70b56a', 0.8);
      break;
    case 'pyrogriffe':
      fillSpike(context, centerX - 12, topY + 8, centerX - 3, topY - 6, centerX + 2, topY + 10, '#ff9651');
      fillSpike(context, centerX + 12, topY + 8, centerX + 3, topY - 6, centerX - 2, topY + 10, '#ffc164');
      fillSpike(context, rightX - 6, bottomY - 10, rightX + 4, bottomY - 2, rightX - 2, bottomY - 16, '#ff6d3b');
      break;
    case 'volcarnage':
      fillSpike(context, centerX - 14, topY + 6, centerX - 6, topY - 10, centerX + 2, topY + 6, '#ff784f');
      fillSpike(context, centerX, topY + 2, centerX + 6, topY - 12, centerX + 12, topY + 6, '#ffcf66');
      fillSpike(context, centerX + 16, topY + 8, centerX + 24, topY - 8, centerX + 28, topY + 10, '#d84e3d');
      break;
    case 'abyssobulle':
      strokeRibbon(context, centerX, midY - 6, centerX - 16 + wingShift, bottomY - 4, '#9be7ff');
      strokeRibbon(context, centerX + 4, midY - 8, centerX + 16 + wingShift, bottomY - 6, '#7ad5ff');
      fillBubble(context, centerX + 15, topY + 4, 5, '#d7f6ff');
      break;
    case 'coralythe':
      fillCoralBranch(context, centerX - 12, topY + 8, '#ff9278');
      fillCoralBranch(context, centerX + 10, topY + 6, '#ffb08d');
      fillLeaf(context, centerX, bottomY - 8, 8, 14, '#6dcf8b', 0);
      break;
    case 'bastionyx':
      fillPlate(context, centerX - 18, midY - 8, 36, 14, '#8d9499');
      fillPlate(context, centerX - 14, topY + 2, 28, 10, '#aab2b8');
      break;
    case 'monolithe':
      fillPlate(context, centerX - 16, topY - 4, 32, 16, '#b7c0c6');
      fillPlate(context, centerX - 20, midY + 4, 40, 14, '#7f8a90');
      fillRune(context, centerX, midY + 10, '#dff7ff');
      break;
    case 'fulguroc':
      fillSpike(context, centerX - 16, topY + 6, centerX - 4, topY - 8, centerX + 4, topY + 8, '#fce65c');
      fillSpike(context, centerX + 4, topY + 2, centerX + 16, topY - 10, centerX + 24, topY + 10, '#fff39b');
      strokeRibbon(context, centerX + 6, midY - 6, rightX + 3, bottomY - 10, '#ffe34e');
      break;
    case 'tempestor':
      strokeRibbon(context, centerX - 6, midY - 8, leftX - 4 + wingShift, bottomY - 10, '#ecf4ff');
      strokeRibbon(context, centerX + 8, midY - 8, rightX + 6 + wingShift, bottomY - 8, '#d6e8ff');
      fillSpike(context, centerX, topY - 2, centerX + 7, topY - 14, centerX + 14, topY + 4, '#fff6ba');
      break;
    case 'none':
      break;
  }
  context.restore();
}

function fillLeaf(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  color: string,
  rotation: number,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function fillPetal(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  for (const offset of [-0.9, -0.3, 0.3, 0.9] as const) {
    fillLeaf(context, x + offset * 7, y + Math.abs(offset) * 3, 6, radius, color, offset);
  }
}

function fillSpike(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  color: string,
) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.lineTo(x3, y3);
  context.closePath();
  context.fill();
}

function strokeRibbon(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
) {
  context.strokeStyle = color;
  context.lineWidth = 4;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.quadraticCurveTo((fromX + toX) / 2, fromY - 8, toX, toY);
  context.stroke();
}

function fillBubble(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function fillCoralBranch(context: CanvasRenderingContext2D, x: number, y: number, color: string) {
  context.strokeStyle = color;
  context.lineWidth = 5;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(x, y + 10);
  context.lineTo(x, y - 6);
  context.moveTo(x, y);
  context.lineTo(x - 8, y - 10);
  context.moveTo(x, y - 2);
  context.lineTo(x + 9, y - 12);
  context.stroke();
}

function fillPlate(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function fillRune(context: CanvasRenderingContext2D, x: number, y: number, color: string) {
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, y - 6);
  context.lineTo(x, y + 6);
  context.moveTo(x - 5, y);
  context.lineTo(x + 5, y);
  context.stroke();
}

function createBaseMapCanvas(ground: string, accent: string) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, ground);
  gradient.addColorStop(1, accent);
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  return canvas;
}

function drawPath(context: CanvasRenderingContext2D, points: Array<[number, number]>, color: string, width: number) {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
}

function drawRockPatch(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x + 18, y + 16, width - 36, 18);
}

function drawShrubCluster(context: CanvasRenderingContext2D, x: number, y: number, color: string) {
  context.fillStyle = color;
  for (const [dx, dy, radius] of [
    [0, 0, 28],
    [28, 16, 22],
    [-24, 18, 20],
    [14, -18, 18],
  ] as const) {
    context.beginPath();
    context.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawWaterPool(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
  context.fill();
}

function drawWave(context: CanvasRenderingContext2D, x: number, y: number) {
  context.strokeStyle = 'rgba(255,255,255,0.52)';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, 18, Math.PI * 0.2, Math.PI * 0.9);
  context.stroke();
}

function drawPalm(context: CanvasRenderingContext2D, x: number, y: number) {
  context.strokeStyle = '#7e5732';
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + 4, y - 42);
  context.stroke();
  for (const angle of [-1.1, -0.5, 0, 0.5, 1.1] as const) {
    fillLeaf(context, x + 4 + angle * 12, y - 44, 10, 28, '#3f9b63', angle);
  }
}

function drawTreeMass(context: CanvasRenderingContext2D, x: number, y: number, color: string) {
  context.fillStyle = '#704d2e';
  context.fillRect(x - 10, y + 18, 20, 46);
  drawShrubCluster(context, x, y, color);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    image.src = src;
  });
}

function directionToMove(direction: Direction) {
  return Object.values(INPUTS).find((move) => move.facing === direction) ?? null;
}

function intersects(a: Rect, b: Rect) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizeHue(value: number) {
  const normalized = value % 1;
  return normalized < 0 ? normalized + 1 : normalized;
}

function isOpaquePixel(data: Uint8ClampedArray, offset: number) {
  return data[offset + 3] > 8;
}

function findTrigger(map: MapDefinition, player: PlayerState) {
  const body = getPlayerBody(player);
  return map.triggers.find((trigger) => intersects(body, trigger)) ?? null;
}

function findFishingSpot(map: MapDefinition, player: PlayerState) {
  return (
    map.fishingSpots.find(
      (spot) => Math.hypot(player.x - spot.x, player.y - spot.y) <= spot.radius,
    ) ?? null
  );
}

function findNearbyMerchant(map: MapDefinition, player: PlayerState) {
  if (!map.merchant) return null;
  return Math.hypot(player.x - map.merchant.x, player.y - map.merchant.y) <= map.merchant.radius
    ? map.merchant
    : null;
}

function findNearbySanctuary(map: MapDefinition, player: PlayerState) {
  if (!map.sanctuary) return null;
  return Math.hypot(player.x - map.sanctuary.x, player.y - map.sanctuary.y) <= map.sanctuary.radius
    ? map.sanctuary
    : null;
}

function findNearbyTeamStation(map: MapDefinition, player: PlayerState) {
  if (!map.teamStation) return null;
  return Math.hypot(player.x - map.teamStation.x, player.y - map.teamStation.y) <= map.teamStation.radius
    ? map.teamStation
    : null;
}

function findNearbyArenaDesk(map: MapDefinition, player: PlayerState) {
  if (!map.arenaDesk) return null;
  return Math.hypot(player.x - map.arenaDesk.x, player.y - map.arenaDesk.y) <= map.arenaDesk.radius
    ? map.arenaDesk
    : null;
}

function findNearbyCreature(game: GameState) {
  const creatures = game.creaturesByMap[game.mapId];
  if (creatures.length === 0) return null;
  return (
    creatures.find((creature) => Math.hypot(game.player.x - creature.x, game.player.y - creature.y) <= 42) ?? null
  );
}

function getPlayerBody(player: PlayerState): Rect {
  return {
    x: player.x - PLAYER_BODY_WIDTH / 2,
    y: player.y - 28,
    width: PLAYER_BODY_WIDTH,
    height: PLAYER_BODY_HEIGHT,
  };
}

function getActionHint(game: GameState) {
  if (game.battle.phase !== 'idle') {
    return game.battle.mode === 'wild' ? 'Duel: 1 Frappe, 2 Sceau, 3 Repli' : 'Arene: 1 Frappe, 2 Focus, 3 Repli';
  }

  if (game.teamMenuOpen) {
    return 'Table des liens ouverte: clique pour composer ton equipe.';
  }

  if (game.fishing.phase !== 'idle') {
    return 'Peche en cours...';
  }

  const map = MAPS[game.mapId];
  const sanctuary = findNearbySanctuary(map, game.player);
  if (sanctuary) {
    return `E pour te ressourcer a ${sanctuary.label.toLowerCase()}`;
  }

  const teamStation = findNearbyTeamStation(map, game.player);
  if (teamStation) {
    return `E pour gerer ton equipe a la ${teamStation.label.toLowerCase()}`;
  }

  const arenaDesk = findNearbyArenaDesk(map, game.player);
  if (arenaDesk) {
    const challenger = ARENA_CHALLENGERS[Math.min(game.arenaProgress, ARENA_CHALLENGERS.length - 1)];
    return `E pour defier ${challenger.name} dans l arene`;
  }

  const merchant = findNearbyMerchant(map, game.player);
  if (merchant) {
    return 'E pour vendre le poisson au marchand';
  }

  const creature = findNearbyCreature(game);
  if (creature) {
    const species = CREATURE_SPECIES[creature.speciesId];
    return `E pour engager ${creature.shiny ? 'Shiny ' : ''}${species.name} (${species.rarity.toLowerCase()})`;
  }

  const fishingSpot = findFishingSpot(map, game.player);
  if (fishingSpot) {
    return `E pour pecher a ${fishingSpot.label.toLowerCase()}`;
  }

  const trigger = findTrigger(map, game.player);
  if (trigger) {
    return trigger.label;
  }

  if (game.mapId === 'outside') return 'Nord, est, ouest, sud: le village est enfin un vrai hub.';
  if (game.mapId === 'south') return 'Route sud: terrain ideal pour les duels et les evolutions.';
  if (game.mapId === 'north') return 'Crete nord: sanctuaire de soin et creatures plus mystiques.';
  if (game.mapId === 'east') return 'Cote est: poissons, embruns et rencontres plus aquatiques.';
  if (game.mapId === 'west') return 'Bois ouest: plus dense, plus rude, plus rocheux.';
  if (game.mapId === 'arena') return 'Arene: ici, ta team de six finit soit en gloire, soit en charpie.';
  return 'Petite pause au calme avant de ressortir.';
}

function createStarterCreature(): CapturedCreature {
  return {
    id: 1,
    speciesId: 'brindibouh',
    speciesName: 'Brindibouh',
    shiny: false,
    iv: 62,
    victories: 0,
  };
}

function getActiveTeam(game: GameState) {
  const roster = new Map(game.capturedCreatures.map((creature) => [creature.id, creature]));
  return game.teamIds.map((id) => roster.get(id)).filter((creature): creature is CapturedCreature => Boolean(creature));
}

function getReserveCreatures(game: GameState) {
  const teamSet = new Set(game.teamIds);
  return game.capturedCreatures.filter((creature) => !teamSet.has(creature.id));
}

function syncTeamIds(teamIds: number[], capturedCreatures: CapturedCreature[]) {
  const rosterIds = new Set(capturedCreatures.map((creature) => creature.id));
  const cleaned = teamIds.filter((id, index) => rosterIds.has(id) && teamIds.indexOf(id) === index).slice(0, 6);
  if (cleaned.length > 0) return cleaned;
  return capturedCreatures[0] ? [capturedCreatures[0].id] : [];
}

function selectCreature(current: GameState, creatureId: number): GameState {
  return {
    ...current,
    selectedCreatureId: creatureId,
  };
}

function closeTeamMenu(current: GameState, text: string): GameState {
  return {
    ...current,
    teamMenuOpen: false,
    notice: {
      text,
      tone: 'info',
      expiresAt: performance.now() + 1700,
    },
  };
}

function openTeamMenu(current: GameState, timestamp: number, station: InteractionPoint): GameState {
  return {
    ...current,
    teamMenuOpen: true,
    selectedCreatureId: current.selectedCreatureId ?? current.teamIds[0] ?? current.capturedCreatures[0]?.id ?? null,
    notice: {
      text: `${station.label}: choisis tes six meilleurs compagnons.`,
      tone: 'info',
      expiresAt: timestamp + 2200,
    },
  };
}

function addCreatureToTeam(current: GameState, creatureId: number, timestamp: number): GameState {
  if (current.teamIds.includes(creatureId)) {
    return {
      ...current,
      notice: {
        text: 'Cette creature est deja dans l equipe.',
        tone: 'info',
        expiresAt: timestamp + 1500,
      },
    };
  }

  if (current.teamIds.length >= 6) {
    return {
      ...current,
      notice: {
        text: 'Equipe deja pleine. Six, pas sept. On n ouvre pas un bus.',
        tone: 'info',
        expiresAt: timestamp + 1700,
      },
    };
  }

  return {
    ...current,
    teamIds: [...current.teamIds, creatureId],
    selectedCreatureId: creatureId,
  };
}

function removeCreatureFromTeam(current: GameState, creatureId: number, timestamp: number): GameState {
  if (!current.teamIds.includes(creatureId)) {
    return current;
  }

  if (current.teamIds.length <= 1) {
    return {
      ...current,
      notice: {
        text: 'Il te faut au moins un meneur dans l equipe.',
        tone: 'info',
        expiresAt: timestamp + 1700,
      },
    };
  }

  return {
    ...current,
    teamIds: current.teamIds.filter((id) => id !== creatureId),
  };
}

function promoteCreatureToLeader(current: GameState, creatureId: number): GameState {
  const nextTeamIds = current.teamIds.includes(creatureId)
    ? [creatureId, ...current.teamIds.filter((id) => id !== creatureId)]
    : [creatureId, ...current.teamIds].slice(0, 6);
  return {
    ...current,
    teamIds: nextTeamIds,
    selectedCreatureId: creatureId,
  };
}

function moveCreatureInTeam(current: GameState, creatureId: number, delta: number): GameState {
  const index = current.teamIds.indexOf(creatureId);
  if (index === -1) return current;
  const target = clamp(index + delta, 0, current.teamIds.length - 1);
  if (target === index) return current;
  const nextTeamIds = [...current.teamIds];
  const [removed] = nextTeamIds.splice(index, 1);
  nextTeamIds.splice(target, 0, removed);
  return {
    ...current,
    teamIds: nextTeamIds,
  };
}

function createCapturedFromWild(creature: CreatureInstance): CapturedCreature {
  return {
    id: creature.id,
    speciesId: creature.speciesId,
    speciesName: CREATURE_SPECIES[creature.speciesId].name,
    shiny: creature.shiny,
    iv: creature.iv,
    victories: 0,
  };
}

function createBattleState(
  mode: 'wild' | 'arena',
  title: string,
  allyTeam: CapturedCreature[],
  foeTeam: CapturedCreature[],
  log: string,
  rewardGold: number,
  sourceWild?: CreatureInstance,
): BattleState {
  return {
    phase: 'active',
    mode,
    title,
    allyTeam,
    allyIndex: 0,
    allyVigors: Object.fromEntries(allyTeam.map((creature) => [creature.id, computeVigor(creature)])),
    foeTeam,
    foeIndex: 0,
    foeVigors: Object.fromEntries(foeTeam.map((creature) => [creature.id, computeVigor(creature)])),
    sourceWild,
    rewardGold,
    log,
  };
}

function buildArenaTeam(challengerIndex: number) {
  const challenger = ARENA_CHALLENGERS[Math.min(challengerIndex, ARENA_CHALLENGERS.length - 1)];
  const team = challenger.team.map((entry, index) => ({
    id: 100000 + challengerIndex * 100 + index,
    speciesId: entry.speciesId,
    speciesName: CREATURE_SPECIES[entry.speciesId].name,
    shiny: Boolean(entry.shiny),
    iv: entry.iv,
    victories: 0,
  }));

  return { challenger, team };
}

function startArenaBattle(current: GameState, timestamp: number, arenaDesk: InteractionPoint): GameState {
  const allyTeam = getActiveTeam(current);
  if (allyTeam.length === 0) {
    return {
      ...current,
      notice: {
        text: `${arenaDesk.label}: compose d abord une equipe dans la maison.`,
        tone: 'info',
        expiresAt: timestamp + 1800,
      },
    };
  }

  const { challenger, team } = buildArenaTeam(current.arenaProgress);
  return {
    ...current,
    battle: createBattleState(
      'arena',
      `Arene des echos`,
      allyTeam,
      team,
      `${challenger.name} t attend avec ${team.length} creatures. Fais pas semblant de ne pas transpirer.`,
      challenger.rewardGold,
    ),
    notice: {
      text: `${challenger.name} entre dans l arene. Recompense: ${challenger.rewardGold} pieces.`,
      tone: 'info',
      expiresAt: timestamp + 2200,
    },
  };
}

function findNextAvailableIndex(
  team: CapturedCreature[],
  vigors: Record<number, number>,
  startIndex: number,
) {
  for (let index = 0; index < team.length; index += 1) {
    const candidate = (startIndex + 1 + index) % team.length;
    if ((vigors[team[candidate].id] ?? 0) > 0) {
      return candidate;
    }
  }
  return -1;
}

function advanceArenaAfterFoeDown(
  current: GameState,
  battle: Extract<BattleState, { phase: 'active' }>,
  ally: CapturedCreature,
  foe: CapturedCreature,
  timestamp: number,
): GameState {
  const nextFoeIndex = findNextAvailableIndex(battle.foeTeam, battle.foeVigors, battle.foeIndex);
  if (nextFoeIndex !== -1) {
    const nextFoe = battle.foeTeam[nextFoeIndex];
    return {
      ...current,
      battle: {
        ...battle,
        foeIndex: nextFoeIndex,
        log: `${ally.speciesName} fait tomber ${foe.speciesName}. ${nextFoe.speciesName} entre en piste.`,
      },
    };
  }

  const ascension = grantVictoryToLeader(current.capturedCreatures, ally.id);
  return {
    ...current,
    capturedCreatures: ascension.creatures,
    teamIds: syncTeamIds(current.teamIds, ascension.creatures),
    arenaProgress: Math.min(current.arenaProgress + 1, ARENA_CHALLENGERS.length),
    gold: current.gold + battle.rewardGold,
    battle: { phase: 'idle' },
    notice: {
      text: `Victoire d arene. ${battle.rewardGold} pieces empochees.${ascension.notice ? ` ${ascension.notice}` : ''}`,
      tone: 'success',
      expiresAt: timestamp + 2600,
    },
  };
}

function grantVictoryToLeader(creatures: CapturedCreature[], leaderId: number) {
  let notice = '';
  const nextCreatures = creatures.map((creature) => {
    if (creature.id !== leaderId) {
      return creature;
    }

    const species = CREATURE_SPECIES[creature.speciesId];
    if (!species.evolvesTo) {
      return {
        ...creature,
        victories: Math.min(creature.victories + 1, EVOLUTION_VICTORIES_REQUIRED),
      };
    }

    const nextVictories = creature.victories + 1;
    if (nextVictories < EVOLUTION_VICTORIES_REQUIRED) {
      return {
        ...creature,
        victories: nextVictories,
      };
    }

    const evolvedSpecies = CREATURE_SPECIES[species.evolvesTo];
    notice = `${species.name} entre en ascension et devient ${evolvedSpecies.name}.`;
    return {
      ...creature,
      speciesId: evolvedSpecies.id,
      speciesName: evolvedSpecies.name,
      victories: 0,
    };
  });

  return {
    creatures: nextCreatures,
    notice,
  };
}

function computeVigor(target: CapturedCreature | CreatureInstance) {
  const species = CREATURE_SPECIES[target.speciesId];
  const base = 46;
  const stageBonus = species.evolutionStage === 2 ? 12 : 0;
  return base + Math.round(target.iv * 0.42) + stageBonus;
}

function computePower(target: CapturedCreature | CreatureInstance) {
  const species = CREATURE_SPECIES[target.speciesId];
  const rarityBonus =
    species.rarity === 'Legendaire'
      ? 7
      : species.rarity === 'Epique'
        ? 5
        : species.rarity === 'Rare'
          ? 3
          : species.rarity === 'Peu commune'
            ? 2
            : 0;
  const stageBonus = species.evolutionStage === 2 ? 4 : 0;
  return 8 + Math.round(target.iv * 0.12) + rarityBonus + stageBonus;
}

function computeBattleDamage(attacker: CapturedCreature | CreatureInstance, defender: CapturedCreature | CreatureInstance) {
  const basePower = computePower(attacker);
  const multiplier = getTypeMultiplier(attacker, defender);
  return Math.max(5, Math.round(basePower * multiplier));
}

function describeEffectiveness(attacker: CapturedCreature | CreatureInstance, defender: CapturedCreature | CreatureInstance) {
  const multiplier = getTypeMultiplier(attacker, defender);
  if (multiplier >= 1.35) return ' C est tres efficace.';
  if (multiplier <= 0.8) return ' L impact est amorti.';
  return '';
}

function getTypeMultiplier(attacker: CapturedCreature | CreatureInstance, defender: CapturedCreature | CreatureInstance) {
  const attackerTypes = CREATURE_SPECIES[attacker.speciesId].types;
  const defenderTypes = CREATURE_SPECIES[defender.speciesId].types;
  let multiplier = 1;

  for (const attackType of attackerTypes) {
    for (const defenseType of defenderTypes) {
      multiplier *= getSingleTypeModifier(attackType, defenseType);
    }
  }

  return clamp(multiplier, 0.65, 1.6);
}

function getSingleTypeModifier(attackType: string, defenseType: string) {
  const chart: Record<string, Record<string, number>> = {
    Feu: { Plante: 1.25, Glace: 1.2, Eau: 0.8, Roche: 0.85 },
    Eau: { Feu: 1.25, Roche: 1.2, Plante: 0.8, Electrik: 0.9 },
    Plante: { Eau: 1.25, Roche: 1.2, Feu: 0.8, Vol: 0.85 },
    Electrik: { Eau: 1.25, Vol: 1.2, Sol: 0.75, Plante: 0.85 },
    Roche: { Feu: 1.2, Vol: 1.2, Eau: 0.85, Acier: 0.9 },
    Vol: { Plante: 1.2, Insecte: 1.2, Electrik: 0.85, Roche: 0.85 },
    Spectre: { Psy: 1.25, Lumiere: 0.78 },
    Lumiere: { Spectre: 1.25, Tenebres: 1.15 },
    Tenebres: { Psy: 1.2, Lumiere: 0.82, Fee: 0.85 },
    Fee: { Tenebres: 1.2, Dragon: 1.25, Acier: 0.85 },
    Dragon: { Dragon: 1.25, Fee: 0.8 },
    Acier: { Roche: 1.2, Fee: 1.15, Feu: 0.85 },
    Glace: { Plante: 1.2, Dragon: 1.2, Feu: 0.82 },
    Sol: { Electrik: 1.25, Feu: 1.1, Vol: 0.8 },
    Psy: { Poison: 1.2, Tenebres: 0.85 },
    Poison: { Fee: 1.2, Plante: 1.1, Roche: 0.85 },
    Insecte: { Plante: 1.1, Psy: 1.2, Feu: 0.82 },
  };

  return chart[attackType]?.[defenseType] ?? 1;
}

function computeSealChance(wildVigor: number, wildMaxVigor: number, creature: CreatureInstance) {
  const species = CREATURE_SPECIES[creature.speciesId];
  const hpRatio = wildMaxVigor <= 0 ? 1 : wildVigor / wildMaxVigor;
  const rarityPenalty =
    species.rarity === 'Legendaire'
      ? 0.26
      : species.rarity === 'Epique'
        ? 0.18
        : species.rarity === 'Rare'
          ? 0.1
          : species.rarity === 'Peu commune'
            ? 0.04
            : 0;
  const shinyPenalty = creature.shiny ? 0.08 : 0;
  return clamp01(0.18 + (1 - hpRatio) * 0.62 - rarityPenalty - shinyPenalty);
}

function rollFish(): CaughtFish {
  const totalWeight = FISH_SPECIES.reduce((sum, species) => sum + species.weight, 0);
  let roll = Math.random() * totalWeight;
  let selected = FISH_SPECIES[0];

  for (const species of FISH_SPECIES) {
    roll -= species.weight;
    if (roll <= 0) {
      selected = species;
      break;
    }
  }

  const sizeCm = Math.round(selected.minSize + Math.random() * (selected.maxSize - selected.minSize));
  const ratio = sizeCm / selected.maxSize;
  const weightKg = Number((0.18 + ratio * (selected.maxSize / 18)).toFixed(2));
  const value = Number((weightKg * selected.valuePerKg).toFixed(1));

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    species: selected.name,
    rarity: selected.rarity,
    sizeCm,
    weightKg,
    value,
  };
}

function getFishInventoryValue(inventory: CaughtFish[]) {
  return inventory.reduce((sum, fish) => sum + fish.value, 0);
}

function renderCapturedLabel(creature: CapturedCreature) {
  const species = CREATURE_SPECIES[creature.speciesId];
  const ascension = species.evolvesTo
    ? ` | Ascension ${Math.min(creature.victories, EVOLUTION_VICTORIES_REQUIRED)}/${EVOLUTION_VICTORIES_REQUIRED}`
    : '';
  return `${creature.shiny ? 'Shiny ' : ''}${creature.speciesName} ${species.types.join('/')} ${creature.iv}% IV${ascension}`;
}

function countFishBySpecies(inventory: CaughtFish[]) {
  const counts = new Map<string, { species: string; count: number }>();
  for (const fish of inventory) {
    const current = counts.get(fish.species);
    if (current) {
      current.count += 1;
    } else {
      counts.set(fish.species, { species: fish.species, count: 1 });
    }
  }

  return Array.from(counts.values()).sort(
    (left, right) => right.count - left.count || left.species.localeCompare(right.species),
  );
}

function randomIv() {
  return Math.floor(Math.random() * 101);
}

function createEncounter(mapId: MapId, slotId: number, roamBounds: Rect): CreatureInstance {
  const species = rollEncounterSpecies(mapId);
  const x = roamBounds.x + roamBounds.width / 2;
  const y = roamBounds.y + roamBounds.height / 2;

  return {
    id: Date.now() + slotId * 100 + Math.floor(Math.random() * 100),
    slotId,
    mapId,
    speciesId: species.id,
    x,
    y,
    startX: x,
    startY: y,
    targetX: x,
    targetY: y,
    moving: false,
    moveStartedAt: 0,
    lastDecisionAt: 0,
    facing: slotId % 2 === 0 ? 'left' : 'right',
    shiny: Math.random() < SHINY_RATE,
    iv: randomIv(),
    roamBounds,
  };
}

function rollEncounterSpecies(mapId: MapId): CreatureSpecies {
  const speciesPool = ENCOUNTER_POOLS[mapId];
  const pool = speciesPool.length > 0 ? speciesPool.map((speciesId) => CREATURE_SPECIES[speciesId]) : Object.values(CREATURE_SPECIES);
  const totalWeight = pool.reduce((sum, species) => sum + species.encounterWeight, 0);
  let roll = Math.random() * totalWeight;

  for (const species of pool) {
    roll -= species.encounterWeight;
    if (roll <= 0) return species;
  }

  return pool[0];
}

function getRodHand(player: PlayerState) {
  switch (player.facing) {
    case 'up':
      return { x: player.x + 6, y: player.y - 44 };
    case 'down':
      return { x: player.x + 12, y: player.y - 36 };
    case 'left':
      return { x: player.x - 8, y: player.y - 36 };
    case 'right':
      return { x: player.x + 10, y: player.y - 36 };
  }
}

function rgbToHsl(red: number, green: number, blue: number): [number, number, number] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) {
    return [0, 0, lightness];
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0);
      break;
    case g:
      hue = (b - r) / delta + 2;
      break;
    default:
      hue = (r - g) / delta + 4;
      break;
  }

  hue /= 6;
  return [hue, saturation, lightness];
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  if (saturation === 0) {
    const value = Math.round(lightness * 255);
    return [value, value, value];
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return [
    Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    Math.round(hueToRgb(p, q, hue) * 255),
    Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
  ];
}

function hueToRgb(p: number, q: number, t: number) {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
}

export default App;
