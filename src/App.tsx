import { useEffect, useRef, useState } from 'react';

const OUTSIDE_MAP_SRC = '/pokemonlike-fantasy/assets/generated/restart/map.png';
const INSIDE_MAP_SRC = '/pokemonlike-fantasy/assets/generated/restart/house-interior.png';
const SOUTH_MAP_SRC = '/pokemonlike-fantasy/assets/generated/restart/route-south.png';
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
const SHINY_RATE = 0.01;

type Direction = 'up' | 'down' | 'left' | 'right';
type MapId = 'outside' | 'inside' | 'south';
type CreatureTemplateId = 'brindibouh' | 'galetout' | 'bullefroth';
type CreatureSpeciesId =
  | 'brindibouh'
  | 'mousseron'
  | 'emberet'
  | 'cendrours'
  | 'bullefroth'
  | 'algobulle'
  | 'galetout'
  | 'silexou'
  | 'voltlynx'
  | 'orageon'
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
};
type CreatureAsset = {
  normalSheet: HTMLCanvasElement;
  shinySheet: HTMLCanvasElement;
  frames: FrameMap;
};
type CapturedCreature = {
  id: number;
  speciesId: CreatureSpeciesId;
  speciesName: string;
  shiny: boolean;
  iv: number;
};
type CreatureInstance = {
  id: number;
  slotId: number;
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
type LoadedAssets = {
  maps: Record<MapId, HTMLImageElement>;
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
  notice: HudNotice | null;
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

const MAPS: Record<MapId, MapDefinition> = {
  outside: {
    id: 'outside',
    name: 'Clairiere du lac',
    src: OUTSIDE_MAP_SRC,
    spawnX: 450,
    spawnY: 360,
    spawnFacing: 'down',
    colliders: [
      { x: 0, y: 0, width: CANVAS_WIDTH, height: 20 },
      { x: 0, y: 0, width: 26, height: CANVAS_HEIGHT },
      { x: CANVAS_WIDTH - 26, y: 0, width: 26, height: CANVAS_HEIGHT },
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

function createSouthCreatures(): CreatureInstance[] {
  return SOUTH_SPAWN_SLOTS.map((roamBounds, index) => createEncounter(index, roamBounds));
}

function createInitialGameState(): GameState {
  return {
    mapId: 'outside',
    player: createPlayerForMap('outside'),
    fishing: { phase: 'idle' },
    fishInventory: [],
    capturedCreatures: [],
    creaturesByMap: {
      outside: [],
      inside: [],
      south: createSouthCreatures(),
    },
    gold: 0,
    notice: null,
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
      const input = INPUTS[key];
      if (input) {
        event.preventDefault();
        heldDirectionRef.current = input.facing;
        bufferedDirectionRef.current = input.facing;

        setGame((current) => {
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
  }, []);

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

  return (
    <main className="app-shell">
      <section className="intro-card">
        <p className="eyebrow">Proto fantasy</p>
        <h1>Marchand, route sud, capture, IV et shiny</h1>
        <p className="description">
          Le perso est plus petit, le marchand rachate ton poisson, et la route du sud ouvre enfin la
          chasse aux creatures roamantes avec IV et versions shiny.
        </p>
        <div className="tips">
          <span>Deplacement: fleches, ZQSD ou WASD</span>
          <span>Action: E pour pecher, vendre ou capturer</span>
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
          {game.capturedCreatures.length > 0 ? (
            <div className="inventory-list">
              {game.capturedCreatures.slice(0, 6).map((creature) => (
                <span key={creature.id}>
                  {renderCapturedLabel(creature)}
                </span>
              ))}
            </div>
          ) : (
            <p className="hud-value">Rien capture. Va fouiller la route du sud.</p>
          )}
          <p className="hud-stat">
            Total: {game.capturedCreatures.length} creatures, dont {shinyCount} shiny
          </p>
        </div>
      </section>
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

function createTemplateAsset(source: HTMLImageElement): CreatureAsset {
  const normalSheet = removeGreenScreen(source);
  return {
    normalSheet,
    shinySheet: shiftSheetHue(normalSheet, 0.42, 0.28, 0.05),
    frames: detectWalkFrames(normalSheet),
  };
}

function createSpeciesAsset(baseAsset: CreatureAsset, species: CreatureSpecies): CreatureAsset {
  const normalSheet = shiftSheetHue(
    baseAsset.normalSheet,
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
  const creatures = game.creaturesByMap[game.mapId];

  if (merchant) {
    drawStack.push({
      y: merchant.y,
      draw: () => drawMerchant(context, assets, merchant),
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

function drawCreature(context: CanvasRenderingContext2D, assets: LoadedAssets, creature: CreatureInstance) {
  const asset = assets.creatures[creature.speciesId];
  const frames = asset.frames[creature.facing];
  const frameIndex = creature.moving ? Math.floor(performance.now() / 150) % frames.length : 1;
  const frame = frames[frameIndex];
  const sheet = creature.shiny ? asset.shinySheet : asset.normalSheet;
  const scale = Math.min(CREATURE_TARGET_HEIGHT / frame.height, CREATURE_TARGET_WIDTH / frame.width);
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
  const mapCreatures = current.creaturesByMap.south;
  if (mapCreatures.length === 0) return current;

  let changed = false;
  const updated = mapCreatures.map((creature) => {
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
    return attemptCreatureMove(creature, choice, timestamp, MAPS.south.colliders);
  });

  if (!changed) return current;

  return {
    ...current,
    creaturesByMap: {
      ...current.creaturesByMap,
      south: updated,
    },
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
      text:
        trigger.kind === 'door'
          ? trigger.targetMap === 'inside'
            ? 'Tu entres dans la maison.'
            : 'Retour dehors.'
          : trigger.targetMap === 'south'
            ? 'Tu descends vers la route sauvage.'
            : 'Retour au village.',
      tone: 'info',
      expiresAt: timestamp + 1800,
    },
  };
}

function handlePrimaryAction(current: GameState, timestamp: number): GameState {
  if (current.player.moving) return current;

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
    return captureCreature(current, creature, timestamp);
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

function captureCreature(current: GameState, creature: CreatureInstance, timestamp: number): GameState {
  const species = CREATURE_SPECIES[creature.speciesId];
  const captured: CapturedCreature = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    speciesId: creature.speciesId,
    speciesName: species.name,
    shiny: creature.shiny,
    iv: creature.iv,
  };
  const replacement = createEncounter(creature.slotId, creature.roamBounds);

  return {
    ...current,
    creaturesByMap: {
      ...current.creaturesByMap,
      south: current.creaturesByMap.south.map((entry) => (entry.id === creature.id ? replacement : entry)),
    },
    capturedCreatures: [captured, ...current.capturedCreatures].slice(0, 30),
    notice: {
      text: `${creature.shiny ? 'Shiny ' : ''}${species.name} capture${creature.shiny ? 'e' : ''}: ${species.types.join('/')} ${creature.iv}% IV, rarete ${species.rarity.toLowerCase()}.`,
      tone: 'success',
      expiresAt: timestamp + 2600,
    },
  };
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
  if (game.fishing.phase !== 'idle') {
    return 'Peche en cours...';
  }

  const map = MAPS[game.mapId];
  const merchant = findNearbyMerchant(map, game.player);
  if (merchant) {
    return 'E pour vendre le poisson au marchand';
  }

  const creature = findNearbyCreature(game);
  if (creature) {
    const species = CREATURE_SPECIES[creature.speciesId];
    return `E pour capturer ${creature.shiny ? 'Shiny ' : ''}${species.name} (${species.rarity.toLowerCase()})`;
  }

  const fishingSpot = findFishingSpot(map, game.player);
  if (fishingSpot) {
    return `E pour pecher a ${fishingSpot.label.toLowerCase()}`;
  }

  const trigger = findTrigger(map, game.player);
  if (trigger) {
    return trigger.label;
  }

  if (game.mapId === 'outside') return 'Maison, marchand, lac, route du sud: tout est la.';
  if (game.mapId === 'south') return 'Explore les herbes hautes et colle les creatures au corps a corps.';
  return 'Petite pause au calme avant de ressortir.';
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
  return `${creature.shiny ? 'Shiny ' : ''}${creature.speciesName} ${species.types.join('/')} ${creature.iv}% IV`;
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

function createEncounter(slotId: number, roamBounds: Rect): CreatureInstance {
  const species = rollEncounterSpecies();
  const x = roamBounds.x + roamBounds.width / 2;
  const y = roamBounds.y + roamBounds.height / 2;

  return {
    id: Date.now() + slotId * 100 + Math.floor(Math.random() * 100),
    slotId,
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

function rollEncounterSpecies(): CreatureSpecies {
  const pool = Object.values(CREATURE_SPECIES);
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
