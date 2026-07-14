import { useEffect, useRef, useState } from 'react';

const OUTSIDE_MAP_SRC = '/pokemonlike-fantasy/assets/generated/restart/map.png';
const INSIDE_MAP_SRC = '/pokemonlike-fantasy/assets/generated/restart/house-interior.png';
const IDLE_SRC = '/pokemonlike-fantasy/assets/generated/restart/player-idle.png';
const WALK_SRC = '/pokemonlike-fantasy/assets/generated/restart/player-walk.png';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;
const STEP_MS = 220;
const PLAYER_TARGET_HEIGHT = 104;
const PLAYER_TARGET_WIDTH = 78;
const PLAYER_BODY_WIDTH = 24;
const PLAYER_BODY_HEIGHT = 26;
const FISH_ACTION_KEY = 'e';

type Direction = 'up' | 'down' | 'left' | 'right';
type MapId = 'outside' | 'inside';
type MoveIntent = { dx: number; dy: number; facing: Direction };
type Rect = { x: number; y: number; width: number; height: number };
type FrameMap = Record<Direction, Rect[]>;
type MapTrigger = Rect & {
  targetMap: MapId;
  targetX: number;
  targetY: number;
  targetFacing: Direction;
  label: string;
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
};
type LoadedAssets = {
  maps: Record<MapId, HTMLImageElement>;
  idleSheet: HTMLCanvasElement;
  walkSheet: HTMLCanvasElement;
  idleFrames: FrameMap;
  walkFrames: FrameMap;
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
  color: string;
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
type HudNotice = {
  text: string;
  tone: 'info' | 'success';
  expiresAt: number;
};
type GameState = {
  mapId: MapId;
  player: PlayerState;
  fishing: FishingState;
  inventory: CaughtFish[];
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
  { name: 'Truite claire', minSize: 18, maxSize: 42, weight: 46, rarity: 'Commune', color: '#7ab7ff', valuePerKg: 8 },
  { name: 'Carpe mousseuse', minSize: 28, maxSize: 68, weight: 28, rarity: 'Commune', color: '#88b16a', valuePerKg: 7 },
  { name: 'Perche lune', minSize: 20, maxSize: 45, weight: 16, rarity: 'Rare', color: '#d2b7ff', valuePerKg: 16 },
  { name: 'Silure des roseaux', minSize: 55, maxSize: 120, weight: 8, rarity: 'Epique', color: '#c69a72', valuePerKg: 20 },
  { name: 'Koi astrale', minSize: 24, maxSize: 52, weight: 2, rarity: 'Tres rare', color: '#ffe48c', valuePerKg: 55 },
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
      { x: 0, y: CANVAS_HEIGHT - 26, width: CANVAS_WIDTH, height: 26 },
      { x: 0, y: 0, width: 26, height: CANVAS_HEIGHT },
      { x: CANVAS_WIDTH - 26, y: 0, width: 26, height: CANVAS_HEIGHT },
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
      },
    ],
    fishingSpots: [],
  },
};

function createInitialPlayer(mapId: MapId): PlayerState {
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

function createInitialGameState(): GameState {
  return {
    mapId: 'outside',
    player: createInitialPlayer('outside'),
    fishing: { phase: 'idle' },
    inventory: [],
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
            player: attemptMove(current.player, input, performance.now(), MAPS[current.mapId].colliders),
          };
        });

        return;
      }

      if (key === FISH_ACTION_KEY) {
        event.preventDefault();
        setGame((current) => startFishing(current, performance.now()));
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
      setGame((current) => advanceGameState(current, timestamp, bufferedDirectionRef.current, heldDirectionRef.current));
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
  const totalValue = game.inventory.reduce((sum, fish) => sum + fish.value, 0);
  const fishCounts = countFishBySpecies(game.inventory);
  const nearbySpot = findFishingSpot(map, game.player);
  const activeTrigger = findTrigger(map, game.player);
  const contextualHint =
    game.fishing.phase !== 'idle'
      ? 'La ligne est a l’eau... attends la touche.'
      : nearbySpot
        ? `Appuie sur E pres de ${nearbySpot.label.toLowerCase()} pour pecher.`
        : activeTrigger
          ? `${activeTrigger.label}.`
          : map.id === 'outside'
            ? 'Entre dans la maison ou peche autour du lac.'
            : 'Ressors par la porte quand tu veux.';

  return (
    <main className="app-shell">
      <section className="intro-card">
        <p className="eyebrow">Proto fantasy</p>
        <h1>Maison jouable, interieur, et debut de peche</h1>
        <p className="description">
          Le perso garde maintenant une hauteur stable entre idle et marche, la porte de la maison
          charge une deuxieme carte, et le lac sert de premiere boucle de peche avec inventaire.
        </p>
        <div className="tips">
          <span>Deplacement: fleches, ZQSD ou WASD</span>
          <span>Peche: touche E sur les bords du lac</span>
          <span>Carte actuelle: {map.name}</span>
        </div>
      </section>

      <section className="game-frame">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          aria-label="Premiere map fantasy avec maison et peche"
        />
      </section>

      <section className="hud-card">
        <div className="hud-block">
          <p className="hud-label">Etat</p>
          <p className="hud-value">{contextualHint}</p>
          <p className={`hud-note ${game.notice?.tone ?? 'info'}`}>
            {game.notice?.text ?? 'Le rare du coin, c’est la Koi astrale. Elle vaut cher, donc ne la bouffe pas.'}
          </p>
        </div>

        <div className="hud-block">
          <p className="hud-label">Inventaire poisson</p>
          {fishCounts.length > 0 ? (
            <div className="inventory-list">
              {fishCounts.map((entry) => (
                <span key={entry.species}>
                  {entry.species}: {entry.count}
                </span>
              ))}
            </div>
          ) : (
            <p className="hud-value">Rien pour l’instant. Les poissons n’aiment pas les poches vides.</p>
          )}
          <p className="hud-value">Valeur future estimee: {totalValue.toFixed(1)} pieces</p>
        </div>
      </section>
    </main>
  );
}

async function buildAssets(): Promise<LoadedAssets> {
  const [outside, inside, idle, walk] = await Promise.all([
    loadImage(OUTSIDE_MAP_SRC),
    loadImage(INSIDE_MAP_SRC),
    loadImage(IDLE_SRC),
    loadImage(WALK_SRC),
  ]);
  const idleSheet = removeGreenScreen(idle);
  const walkSheet = removeGreenScreen(walk);

  return {
    maps: {
      outside,
      inside,
    },
    idleSheet,
    walkSheet,
    idleFrames: detectIdleFrames(idleSheet),
    walkFrames: detectWalkFrames(walkSheet),
  };
}

function renderScene(context: CanvasRenderingContext2D, assets: LoadedAssets, game: GameState) {
  context.imageSmoothingEnabled = true;
  context.drawImage(assets.maps[game.mapId], 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawMapLabel(context, MAPS[game.mapId].name);
  drawPlayerShadow(context, game.player.x, game.player.y);
  drawFishingOverlay(context, game);
  drawPlayer(context, assets, game.player);
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
  const sourceFrames = player.moving ? assets.walkFrames[player.facing] : assets.idleFrames[player.facing];
  const frameIndex = player.moving ? Math.floor(performance.now() / 120) % sourceFrames.length : 0;
  const frame = sourceFrames[frameIndex];
  const image = player.moving ? assets.walkSheet : assets.idleSheet;
  const scale = Math.min(PLAYER_TARGET_HEIGHT / frame.height, PLAYER_TARGET_WIDTH / frame.width);

  const drawWidth = Math.round(frame.width * scale);
  const drawHeight = Math.round(frame.height * scale);
  const px = player.x - drawWidth / 2;
  const py = player.y - drawHeight + 10;

  context.drawImage(
    image,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    px,
    py,
    drawWidth,
    drawHeight,
  );
}

function drawPlayerShadow(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = 'rgba(20, 28, 18, 0.18)';
  context.beginPath();
  context.ellipse(x, y + 4, 14, 7, 0, 0, Math.PI * 2);
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
  const map = MAPS[game.mapId];
  const spot = findFishingSpot(map, game.player);
  const trigger = findTrigger(map, game.player);
  const hint =
    game.fishing.phase !== 'idle'
      ? 'Peche en cours...'
      : spot
        ? 'E pour pecher'
        : trigger
          ? trigger.label
          : '';
  if (!hint) return;

  context.fillStyle = 'rgba(17, 27, 11, 0.76)';
  context.fillRect(326, 22, 308, 38);
  context.fillStyle = '#f7f2da';
  context.font = '600 18px Georgia';
  context.fillText(hint, 346, 47);
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

  if (current.notice && current.notice.expiresAt <= timestamp) {
    next = { ...next, notice: null };
  }

  next = advanceFishing(next, timestamp);
  next = advanceMovement(next, timestamp, bufferedDirection, heldDirection);
  next = applyTrigger(next, timestamp);
  return next;
}

function advanceMovement(
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

    const moved = attemptMove(player, nextMove, timestamp, map.colliders);
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

  const moved = attemptMove(settled, nextMove, timestamp, map.colliders);
  return { ...current, player: moved };
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
        text: 'La ligne flotte. Ca mord quand ca mord.',
        tone: 'info',
        expiresAt: timestamp + 1600,
      },
    };
  }

  if (current.fishing.phase === 'waiting' && timestamp >= current.fishing.resolveAt) {
    const caught = rollFish();
    return {
      ...current,
      inventory: [caught, ...current.inventory].slice(0, 18),
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
  if (current.player.moving) return current;
  if (current.fishing.phase !== 'idle') return current;

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
      text: trigger.targetMap === 'inside' ? 'Tu entres dans la maison.' : 'Retour dehors.',
      tone: 'info',
      expiresAt: timestamp + 1800,
    },
  };
}

function startFishing(current: GameState, timestamp: number): GameState {
  if (current.mapId !== 'outside') {
    return {
      ...current,
      notice: {
        text: 'Pas de lac ici. Evite de pecher dans le parquet.',
        tone: 'info',
        expiresAt: timestamp + 1800,
      },
    };
  }

  if (current.player.moving || current.fishing.phase !== 'idle') {
    return current;
  }

  const spot = findFishingSpot(MAPS[current.mapId], current.player);
  if (!spot) {
    return {
      ...current,
      notice: {
        text: 'Approche-toi vraiment du bord du lac.',
        tone: 'info',
        expiresAt: timestamp + 1800,
      },
    };
  }

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
      expiresAt: timestamp + waitDuration,
    },
  };
}

function attemptMove(player: PlayerState, move: MoveIntent, timestamp: number, colliders: Rect[]): PlayerState {
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

      if (pixelCount > 500) {
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

function isOpaquePixel(data: Uint8ClampedArray, offset: number) {
  return data[offset + 3] > 8;
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

    if (green > 210 && red < 90 && blue < 90) {
      data[index + 3] = 0;
    }
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

function getPlayerBody(player: PlayerState): Rect {
  return {
    x: player.x - PLAYER_BODY_WIDTH / 2,
    y: player.y - 28,
    width: PLAYER_BODY_WIDTH,
    height: PLAYER_BODY_HEIGHT,
  };
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

function getRodHand(player: PlayerState) {
  switch (player.facing) {
    case 'up':
      return { x: player.x + 6, y: player.y - 52 };
    case 'down':
      return { x: player.x + 14, y: player.y - 44 };
    case 'left':
      return { x: player.x - 8, y: player.y - 44 };
    case 'right':
      return { x: player.x + 12, y: player.y - 44 };
  }
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

  return Array.from(counts.values()).sort((left, right) => right.count - left.count || left.species.localeCompare(right.species));
}

export default App;
