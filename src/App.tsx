import { useEffect, useRef, useState } from 'react';

const TILE = 48;
const STEP_DURATION_MS = 170;
const TELEPORT_COOLDOWN_MS = 220;

const ASSET_SOURCES = {
  player: '/pokemonlike-fantasy/assets/generated/pack2/player-walk-sheet-v2-chroma.png',
  house: '/pokemonlike-fantasy/assets/generated/pack2/house-chroma.png',
  tree: '/pokemonlike-fantasy/assets/generated/pack2/tree-chroma.png',
  pond: '/pokemonlike-fantasy/assets/generated/pack2/pond-chroma.png',
  foliage: '/pokemonlike-fantasy/assets/generated/pack2/foliage-chroma.png',
  fence: '/pokemonlike-fantasy/assets/generated/pack2/fence-chroma.png',
} as const;

type AssetKey = keyof typeof ASSET_SOURCES;
type Direction = 'up' | 'down' | 'left' | 'right';
type SceneId = 'outdoor' | 'interior';
type TileType =
  | 'grass'
  | 'path'
  | 'tallGrass'
  | 'fence'
  | 'flowers'
  | 'water'
  | 'houseWall'
  | 'houseRoof'
  | 'door'
  | 'tree'
  | 'bush'
  | 'interiorFloor'
  | 'interiorWall'
  | 'rug'
  | 'bed'
  | 'table'
  | 'bookshelf'
  | 'plant'
  | 'stool';

type MoveIntent = { dx: number; dy: number; facing: Direction };
type PlayerState = {
  tileX: number;
  tileY: number;
  renderX: number;
  renderY: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  facing: Direction;
  moving: boolean;
  moveStartTime: number;
};
type GameState = {
  sceneId: SceneId;
  player: PlayerState;
  cooldownUntil: number;
};
type Doorway = {
  x: number;
  y: number;
  targetScene: SceneId;
  spawnX: number;
  spawnY: number;
  facing: Direction;
};
type SceneConfig = {
  title: string;
  subtitle: string;
  map: TileType[][];
  doorways: Doorway[];
};
type Drawable = {
  depthY: number;
  draw: (context: CanvasRenderingContext2D) => void;
};
type AssetMap = Record<AssetKey, HTMLCanvasElement>;

const OUTDOOR_MAP: TileType[][] = [
  ['tree', 'tree', 'grass', 'grass', 'flowers', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'flowers', 'grass', 'tree', 'tree', 'tree'],
  ['tree', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'water', 'water', 'water', 'grass', 'grass', 'grass', 'tree', 'tree'],
  ['grass', 'grass', 'flowers', 'grass', 'tallGrass', 'houseRoof', 'houseRoof', 'houseRoof', 'houseRoof', 'houseRoof', 'tallGrass', 'grass', 'bush', 'grass', 'grass', 'tree'],
  ['grass', 'grass', 'grass', 'grass', 'tallGrass', 'houseWall', 'houseWall', 'houseWall', 'houseWall', 'houseWall', 'tallGrass', 'flowers', 'grass', 'grass', 'grass', 'grass'],
  ['grass', 'flowers', 'grass', 'grass', 'grass', 'houseWall', 'houseWall', 'door', 'houseWall', 'houseWall', 'grass', 'grass', 'grass', 'bush', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'tallGrass', 'tallGrass', 'path', 'path', 'path', 'path', 'path', 'grass', 'flowers', 'grass', 'grass', 'grass', 'grass'],
  ['grass', 'bush', 'grass', 'fence', 'fence', 'path', 'grass', 'tallGrass', 'tallGrass', 'path', 'grass', 'grass', 'grass', 'tree', 'grass', 'grass'],
  ['grass', 'tallGrass', 'tallGrass', 'tallGrass', 'grass', 'path', 'grass', 'tallGrass', 'flowers', 'path', 'path', 'path', 'path', 'grass', 'grass', 'grass'],
  ['grass', 'flowers', 'grass', 'bush', 'grass', 'path', 'grass', 'tallGrass', 'tallGrass', 'grass', 'grass', 'grass', 'path', 'grass', 'water', 'water'],
  ['tree', 'grass', 'grass', 'flowers', 'grass', 'path', 'grass', 'tree', 'grass', 'flowers', 'grass', 'grass', 'path', 'grass', 'water', 'water'],
  ['tree', 'grass', 'grass', 'grass', 'grass', 'path', 'path', 'path', 'path', 'path', 'path', 'path', 'path', 'grass', 'grass', 'grass'],
  ['tree', 'tree', 'grass', 'grass', 'flowers', 'grass', 'grass', 'flowers', 'grass', 'grass', 'bush', 'grass', 'grass', 'grass', 'tree', 'tree'],
];

const INTERIOR_MAP: TileType[][] = [
  ['interiorWall', 'interiorWall', 'interiorWall', 'interiorWall', 'interiorWall', 'interiorWall', 'interiorWall', 'interiorWall', 'interiorWall', 'interiorWall'],
  ['interiorWall', 'bookshelf', 'bookshelf', 'interiorFloor', 'plant', 'interiorFloor', 'bookshelf', 'bookshelf', 'plant', 'interiorWall'],
  ['interiorWall', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorWall'],
  ['interiorWall', 'bed', 'bed', 'interiorFloor', 'rug', 'rug', 'interiorFloor', 'table', 'table', 'interiorWall'],
  ['interiorWall', 'bed', 'bed', 'interiorFloor', 'rug', 'rug', 'interiorFloor', 'table', 'table', 'interiorWall'],
  ['interiorWall', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'stool', 'interiorFloor', 'interiorWall'],
  ['interiorWall', 'plant', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'interiorFloor', 'plant', 'interiorWall'],
  ['interiorWall', 'interiorWall', 'interiorWall', 'interiorWall', 'door', 'interiorWall', 'interiorWall', 'interiorWall', 'interiorWall', 'interiorWall'],
];

const SCENES: Record<SceneId, SceneConfig> = {
  outdoor: {
    title: 'Extérieur du village',
    subtitle: 'Herbes hautes, profondeur de décor et maison traversable',
    map: OUTDOOR_MAP,
    doorways: [{ x: 7, y: 4, targetScene: 'interior', spawnX: 4, spawnY: 6, facing: 'up' }],
  },
  interior: {
    title: 'Intérieur de maison',
    subtitle: 'Tu peux entrer, tourner autour des meubles et ressortir par la porte',
    map: INTERIOR_MAP,
    doorways: [{ x: 4, y: 7, targetScene: 'outdoor', spawnX: 7, spawnY: 5, facing: 'down' }],
  },
};

const BLOCKING_TILES = new Set<TileType>([
  'water',
  'fence',
  'houseWall',
  'houseRoof',
  'tree',
  'bush',
  'interiorWall',
  'bed',
  'table',
  'bookshelf',
  'plant',
  'stool',
]);

const MOVEMENT_KEYS: Record<string, MoveIntent> = {
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

const SPRITE_ROWS: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetsRef = useRef<AssetMap | null>(null);
  const heldDirectionRef = useRef<Direction | null>(null);
  const bufferedDirectionRef = useRef<Direction | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const [game, setGame] = useState<GameState>({
    sceneId: 'outdoor',
    player: {
      tileX: 7,
      tileY: 7,
      renderX: 7,
      renderY: 7,
      startX: 7,
      startY: 7,
      targetX: 7,
      targetY: 7,
      facing: 'down',
      moving: false,
      moveStartTime: 0,
    },
    cooldownUntil: 0,
  });

  const currentScene = SCENES[game.sceneId];
  const canvasWidth = getSceneWidth(currentScene) * TILE;
  const canvasHeight = getSceneHeight(currentScene) * TILE;

  useEffect(() => {
    let cancelled = false;

    loadAllAssets().then((assetMap) => {
      if (cancelled) return;
      assetsRef.current = assetMap;
      setAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const nextMove = MOVEMENT_KEYS[key];
      if (!nextMove) return;

      event.preventDefault();
      heldDirectionRef.current = nextMove.facing;
      bufferedDirectionRef.current = nextMove.facing;

      setGame((current) => {
        if (current.player.moving) {
          return current.player.facing === nextMove.facing
            ? current
            : { ...current, player: { ...current.player, facing: nextMove.facing } };
        }

        return attemptMove(current, nextMove, performance.now());
      });
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const move = MOVEMENT_KEYS[key];
      if (!move) return;

      if (heldDirectionRef.current === move.facing) {
        heldDirectionRef.current = null;
      }
      if (bufferedDirectionRef.current === move.facing) {
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
    let animationFrameId = 0;

    const tick = (timestamp: number) => {
      setGame((current) => {
        if (!current.player.moving) {
          if (timestamp < current.cooldownUntil) {
            return current;
          }

          const nextDirection = bufferedDirectionRef.current ?? heldDirectionRef.current;
          if (!nextDirection) return current;
          const nextMove = directionToMove(nextDirection);
          return nextMove ? attemptMove(current, nextMove, timestamp) : current;
        }

        const elapsed = timestamp - current.player.moveStartTime;
        const progress = Math.min(elapsed / STEP_DURATION_MS, 1);
        const nextRenderX = lerp(current.player.startX, current.player.targetX, progress);
        const nextRenderY = lerp(current.player.startY, current.player.targetY, progress);

        if (progress < 1) {
          return {
            ...current,
            player: {
              ...current.player,
              renderX: nextRenderX,
              renderY: nextRenderY,
            },
          };
        }

        const settled: GameState = {
          ...current,
          player: {
            ...current.player,
            tileX: current.player.targetX,
            tileY: current.player.targetY,
            renderX: current.player.targetX,
            renderY: current.player.targetY,
            startX: current.player.targetX,
            startY: current.player.targetY,
            moving: false,
          },
        };

        const transitioned = resolveDoorway(settled, timestamp);
        if (transitioned.sceneId !== settled.sceneId) {
          return transitioned;
        }

        const nextDirection = bufferedDirectionRef.current ?? heldDirectionRef.current;
        if (!nextDirection) {
          return transitioned;
        }

        const nextMove = directionToMove(nextDirection);
        return nextMove ? attemptMove(transitioned, nextMove, timestamp) : transitioned;
      });

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const assets = assetsRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!assetsReady || !assets) {
      context.fillStyle = '#8fcf73';
      context.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    renderScene(context, assets, game);
  }, [assetsReady, game]);

  return (
    <main className="app-shell">
      <section className="intro-card">
        <p className="eyebrow">{game.sceneId === 'outdoor' ? 'Round 3' : 'Intérieur'}</p>
        <h1>Herbes hautes, profondeur et maison jouable</h1>
        <p className="description">{currentScene.subtitle}</p>
        <div className="tips">
          <span>Déplacement: flèches, ZQSD ou WASD</span>
          <span>Traverse la porte de la maison pour entrer</span>
          <span>Le joueur passe devant ou derrière les décors selon sa position</span>
        </div>
      </section>

      <section className="game-frame">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          aria-label={currentScene.title}
        />
      </section>
    </main>
  );
}

async function loadAllAssets() {
  const entries = await Promise.all(
    Object.entries(ASSET_SOURCES).map(async ([key, src]) => {
      const image = await loadImage(src);
      return [key, removeGreenScreen(image)] as const;
    }),
  );

  return Object.fromEntries(entries) as AssetMap;
}

function renderScene(context: CanvasRenderingContext2D, assets: AssetMap, game: GameState) {
  context.imageSmoothingEnabled = true;
  if (game.sceneId === 'outdoor') {
    renderOutdoorScene(context, assets, game.player);
    return;
  }

  renderInteriorScene(context, assets.player, game.player);
}

function renderOutdoorScene(
  context: CanvasRenderingContext2D,
  assets: AssetMap,
  player: PlayerState,
) {
  drawOutdoorGround(context, OUTDOOR_MAP);
  drawPonds(context, assets.pond);
  drawPathNetwork(context, OUTDOOR_MAP);
  drawFlowerBeds(context, OUTDOOR_MAP, assets.foliage);
  drawTallGrassBase(context, OUTDOOR_MAP);

  const drawables = [
    createHouseDrawable(assets.house),
    ...createFenceDrawables(OUTDOOR_MAP, assets.fence),
    ...createBushDrawables(OUTDOOR_MAP, assets.foliage),
    ...createTreeDrawables(OUTDOOR_MAP, assets.tree),
    createPlayerDrawable(assets.player, player, 46, 48),
  ];

  drawDepthSorted(context, drawables);
  drawTallGrassOverlay(context, OUTDOOR_MAP, player);
}

function renderInteriorScene(
  context: CanvasRenderingContext2D,
  playerSprite: HTMLCanvasElement,
  player: PlayerState,
) {
  drawInteriorShell(context, INTERIOR_MAP);

  const drawables = [
    ...createInteriorObjectDrawables(INTERIOR_MAP),
    createPlayerDrawable(playerSprite, player, 44, 46),
  ];

  drawDepthSorted(context, drawables);
}

function drawDepthSorted(context: CanvasRenderingContext2D, drawables: Drawable[]) {
  drawables
    .slice()
    .sort((left, right) => left.depthY - right.depthY)
    .forEach((drawable) => drawable.draw(context));
}

function drawOutdoorGround(context: CanvasRenderingContext2D, map: TileType[][]) {
  const width = getSceneWidthFromMap(map) * TILE;
  const height = getSceneHeightFromMap(map) * TILE;
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#dff2ff');
  sky.addColorStop(0.26, '#ddf7d5');
  sky.addColorStop(1, '#9ddc6c');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  for (let y = 0; y < getSceneHeightFromMap(map); y += 1) {
    for (let x = 0; x < getSceneWidthFromMap(map); x += 1) {
      const tile = map[y][x];
      const px = x * TILE;
      const py = y * TILE;
      const fill = context.createLinearGradient(px, py, px, py + TILE);

      if (tile === 'tallGrass') {
        fill.addColorStop(0, '#8fe16c');
        fill.addColorStop(1, '#4fa34a');
      } else {
        fill.addColorStop(0, '#9be274');
        fill.addColorStop(1, '#68b956');
      }

      context.fillStyle = fill;
      fillRoundedRect(context, px, py, TILE, TILE, 14);

      context.fillStyle =
        tile === 'tallGrass'
          ? 'rgba(28, 92, 34, 0.12)'
          : (x + y) % 2 === 0
            ? 'rgba(241,255,207,0.14)'
            : 'rgba(57,114,48,0.07)';
      fillRoundedRect(context, px + 1, py + 1, TILE - 2, TILE - 2, 14);

      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.beginPath();
      context.ellipse(px + 14, py + 14, 8, 4, -0.2, 0, Math.PI * 2);
      context.ellipse(px + 30, py + 31, 7, 3, 0.18, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawPonds(context: CanvasRenderingContext2D, pond: HTMLCanvasElement) {
  context.drawImage(pond, 414, 32, 232, 232);
  context.drawImage(pond, 580, 344, 164, 164);
}

function drawPathNetwork(context: CanvasRenderingContext2D, map: TileType[][]) {
  for (let y = 0; y < getSceneHeightFromMap(map); y += 1) {
    for (let x = 0; x < getSceneWidthFromMap(map); x += 1) {
      if (!isPathLike(map, x, y)) continue;

      const centerX = x * TILE + TILE / 2;
      const centerY = y * TILE + TILE / 2;

      context.fillStyle = '#ceb386';
      context.beginPath();
      context.arc(centerX, centerY, 18, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#ebd9b5';
      context.beginPath();
      context.arc(centerX - 1.5, centerY - 2.5, 12, 0, Math.PI * 2);
      context.fill();

      if (isPathLike(map, x + 1, y)) {
        drawPathLink(context, centerX, centerY, centerX + TILE / 2, centerY);
      }
      if (isPathLike(map, x, y + 1)) {
        drawPathLink(context, centerX, centerY, centerX, centerY + TILE / 2);
      }
    }
  }
}

function drawPathLink(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  context.strokeStyle = '#ceb386';
  context.lineWidth = 34;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();

  context.strokeStyle = '#ebd9b5';
  context.lineWidth = 22;
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();
}

function drawFlowerBeds(
  context: CanvasRenderingContext2D,
  map: TileType[][],
  foliage: HTMLCanvasElement,
) {
  forEachTile(map, 'flowers', (x, y) => {
    const px = x * TILE - 2;
    const py = y * TILE + 8;
    context.save();
    context.globalAlpha = 0.96;
    context.drawImage(foliage, px, py, 58, 58);
    context.restore();
  });
}

function drawTallGrassBase(context: CanvasRenderingContext2D, map: TileType[][]) {
  forEachTile(map, 'tallGrass', (x, y) => {
    const px = x * TILE;
    const py = y * TILE;

    context.fillStyle = 'rgba(47, 128, 52, 0.28)';
    context.beginPath();
    context.ellipse(px + TILE / 2, py + 35, 17, 9, 0, 0, Math.PI * 2);
    context.fill();

    for (let blade = 0; blade < 6; blade += 1) {
      const bladeX = px + 8 + blade * 6;
      const bladeHeight = 14 + (blade % 3) * 4;
      context.strokeStyle = blade % 2 === 0 ? '#2d8d3e' : '#65c852';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(bladeX, py + 40);
      context.quadraticCurveTo(bladeX - 3, py + 40 - bladeHeight / 2, bladeX + 2, py + 40 - bladeHeight);
      context.stroke();
    }
  });
}

function drawTallGrassOverlay(
  context: CanvasRenderingContext2D,
  map: TileType[][],
  player: PlayerState,
) {
  forEachTile(map, 'tallGrass', (x, y) => {
    const isNearPlayer =
      Math.abs(player.renderX - x) < 0.9 && Math.abs(player.renderY - y) < 0.9;

    if (!isNearPlayer) return;

    const px = x * TILE;
    const py = y * TILE;
    context.save();
    context.globalAlpha = 0.9;

    for (let blade = 0; blade < 7; blade += 1) {
      const bladeX = px + 6 + blade * 5.5;
      const bladeHeight = 18 + (blade % 4) * 3;
      context.strokeStyle = blade % 2 === 0 ? '#6dd45f' : '#3d9f45';
      context.lineWidth = 3.2;
      context.beginPath();
      context.moveTo(bladeX, py + 42);
      context.quadraticCurveTo(bladeX - 4, py + 42 - bladeHeight / 2, bladeX + 1, py + 42 - bladeHeight);
      context.stroke();
    }

    context.restore();
  });
}

function createHouseDrawable(house: HTMLCanvasElement): Drawable {
  const drawWidth = 314;
  const drawHeight = 240;
  const x = 214;
  const y = 18;

  return {
    depthY: y + drawHeight - 16,
    draw: (context) => {
      context.fillStyle = 'rgba(73, 55, 37, 0.16)';
      context.beginPath();
      context.ellipse(x + drawWidth / 2, y + drawHeight - 14, 88, 18, 0, 0, Math.PI * 2);
      context.fill();
      context.drawImage(house, x, y, drawWidth, drawHeight);
    },
  };
}

function createFenceDrawables(map: TileType[][], fence: HTMLCanvasElement) {
  const drawables: Drawable[] = [];

  forEachTile(map, 'fence', (x, y) => {
    drawables.push({
      depthY: y * TILE + TILE - 8,
      draw: (context) => {
        context.drawImage(fence, x * TILE - 18, y * TILE + 11, 92, 34);
      },
    });
  });

  return drawables;
}

function createBushDrawables(map: TileType[][], foliage: HTMLCanvasElement) {
  const drawables: Drawable[] = [];

  forEachTile(map, 'bush', (x, y) => {
    drawables.push({
      depthY: y * TILE + TILE + 4,
      draw: (context) => {
        context.drawImage(foliage, x * TILE - 10, y * TILE + 2, 72, 72);
      },
    });
  });

  return drawables;
}

function createTreeDrawables(map: TileType[][], tree: HTMLCanvasElement) {
  const drawables: Drawable[] = [];

  forEachTile(map, 'tree', (x, y) => {
    drawables.push({
      depthY: y * TILE + TILE + 8,
      draw: (context) => {
        context.drawImage(tree, x * TILE - 28, y * TILE - 34, 108, 108);
      },
    });
  });

  return drawables;
}

function drawInteriorShell(context: CanvasRenderingContext2D, map: TileType[][]) {
  const width = getSceneWidthFromMap(map) * TILE;
  const height = getSceneHeightFromMap(map) * TILE;

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#f7dfb2');
  background.addColorStop(1, '#d9b17d');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  for (let y = 0; y < getSceneHeightFromMap(map); y += 1) {
    for (let x = 0; x < getSceneWidthFromMap(map); x += 1) {
      const tile = map[y][x];
      const px = x * TILE;
      const py = y * TILE;

      if (tile === 'interiorWall') {
        const wallFill = context.createLinearGradient(px, py, px, py + TILE);
        wallFill.addColorStop(0, '#d79b5d');
        wallFill.addColorStop(1, '#9f6134');
        context.fillStyle = wallFill;
        fillRoundedRect(context, px, py, TILE, TILE, 12);

        context.fillStyle = 'rgba(255, 236, 196, 0.18)';
        fillRoundedRect(context, px + 4, py + 4, TILE - 8, TILE - 12, 10);
        continue;
      }

      const woodFill = context.createLinearGradient(px, py, px + TILE, py + TILE);
      woodFill.addColorStop(0, '#f0c48b');
      woodFill.addColorStop(1, '#c98f56');
      context.fillStyle = woodFill;
      fillRoundedRect(context, px, py, TILE, TILE, 10);

      context.strokeStyle = 'rgba(129, 73, 37, 0.24)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(px + 8, py + 12);
      context.lineTo(px + TILE - 8, py + 12);
      context.moveTo(px + 8, py + 26);
      context.lineTo(px + TILE - 8, py + 26);
      context.moveTo(px + 8, py + 40);
      context.lineTo(px + TILE - 8, py + 40);
      context.stroke();

      if (tile === 'rug') {
        drawRugTile(context, px, py);
      }

      if (tile === 'door') {
        drawInteriorDoorTile(context, px, py);
      }
    }
  }
}

function drawRugTile(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = '#b13f4a';
  fillRoundedRect(context, x + 4, y + 6, TILE - 8, TILE - 12, 10);
  context.strokeStyle = '#f4d39f';
  context.lineWidth = 3;
  context.strokeRect(x + 10, y + 12, TILE - 20, TILE - 24);
}

function drawInteriorDoorTile(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = '#81522d';
  fillRoundedRect(context, x + 8, y + 10, TILE - 16, TILE - 8, 10);
  context.fillStyle = 'rgba(255, 222, 162, 0.2)';
  fillRoundedRect(context, x + 14, y + 12, TILE - 28, TILE - 20, 8);
}

function createInteriorObjectDrawables(map: TileType[][]) {
  const drawables: Drawable[] = [];

  forEachTile(map, 'bookshelf', (x, y) => {
    drawables.push({
      depthY: y * TILE + TILE + 2,
      draw: (context) => drawBookshelf(context, x * TILE, y * TILE),
    });
  });

  forEachTile(map, 'bed', (x, y) => {
    drawables.push({
      depthY: y * TILE + TILE + 10,
      draw: (context) => drawBed(context, x * TILE, y * TILE),
    });
  });

  forEachTile(map, 'table', (x, y) => {
    drawables.push({
      depthY: y * TILE + TILE + 8,
      draw: (context) => drawTable(context, x * TILE, y * TILE),
    });
  });

  forEachTile(map, 'plant', (x, y) => {
    drawables.push({
      depthY: y * TILE + TILE + 6,
      draw: (context) => drawPlant(context, x * TILE, y * TILE),
    });
  });

  forEachTile(map, 'stool', (x, y) => {
    drawables.push({
      depthY: y * TILE + TILE + 3,
      draw: (context) => drawStool(context, x * TILE, y * TILE),
    });
  });

  return drawables;
}

function drawBookshelf(context: CanvasRenderingContext2D, x: number, y: number) {
  const fill = context.createLinearGradient(x, y, x, y + TILE);
  fill.addColorStop(0, '#a96839');
  fill.addColorStop(1, '#70411f');
  context.fillStyle = fill;
  fillRoundedRect(context, x + 3, y + 3, TILE - 6, TILE - 6, 10);

  context.fillStyle = '#f7dfb8';
  context.fillRect(x + 9, y + 11, TILE - 18, 4);
  context.fillRect(x + 9, y + 23, TILE - 18, 4);
  context.fillRect(x + 9, y + 35, TILE - 18, 4);

  context.fillStyle = '#3f7fcb';
  context.fillRect(x + 12, y + 16, 6, 10);
  context.fillStyle = '#d64554';
  context.fillRect(x + 22, y + 16, 8, 10);
  context.fillStyle = '#66a53a';
  context.fillRect(x + 32, y + 16, 5, 10);
}

function drawBed(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = '#8b5934';
  fillRoundedRect(context, x + 4, y + 8, TILE - 8, TILE - 12, 12);
  context.fillStyle = '#f5f0df';
  fillRoundedRect(context, x + 8, y + 10, TILE - 16, 12, 8);
  context.fillStyle = '#6c96d8';
  fillRoundedRect(context, x + 8, y + 22, TILE - 16, TILE - 22, 10);
}

function drawTable(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = '#8e5730';
  fillRoundedRect(context, x + 6, y + 10, TILE - 12, TILE - 18, 10);
  context.fillStyle = '#70401f';
  context.fillRect(x + 10, y + 28, 6, 14);
  context.fillRect(x + TILE - 16, y + 28, 6, 14);
  context.fillStyle = '#f4d39f';
  context.beginPath();
  context.arc(x + TILE / 2, y + 20, 5, 0, Math.PI * 2);
  context.fill();
}

function drawPlant(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = '#b86a3f';
  fillRoundedRect(context, x + 14, y + 24, 20, 14, 6);
  context.fillStyle = '#2f9551';
  context.beginPath();
  context.ellipse(x + 24, y + 20, 13, 11, 0, 0, Math.PI * 2);
  context.ellipse(x + 16, y + 18, 8, 12, -0.4, 0, Math.PI * 2);
  context.ellipse(x + 31, y + 16, 7, 10, 0.4, 0, Math.PI * 2);
  context.fill();
}

function drawStool(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = '#8a5229';
  context.beginPath();
  context.ellipse(x + 24, y + 20, 11, 7, 0, 0, Math.PI * 2);
  context.fill();
  context.fillRect(x + 18, y + 22, 4, 12);
  context.fillRect(x + 26, y + 22, 4, 12);
}

function createPlayerDrawable(
  spriteSheet: HTMLCanvasElement,
  player: PlayerState,
  drawWidth: number,
  drawHeight: number,
): Drawable {
  return {
    depthY: player.renderY * TILE + TILE,
    draw: (context) => {
      drawPlayerShadow(context, player.renderX, player.renderY);
      drawPlayerSprite(context, spriteSheet, player, drawWidth, drawHeight);
    },
  };
}

function drawPlayerShadow(context: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const centerX = tileX * TILE + TILE / 2;
  const centerY = tileY * TILE + TILE - 7;

  context.fillStyle = 'rgba(29, 34, 24, 0.18)';
  context.beginPath();
  context.ellipse(centerX, centerY, 12, 6, 0, 0, Math.PI * 2);
  context.fill();
}

function drawPlayerSprite(
  context: CanvasRenderingContext2D,
  spriteSheet: HTMLCanvasElement,
  player: PlayerState,
  drawWidth: number,
  drawHeight: number,
) {
  const spriteWidth = spriteSheet.width / 3;
  const spriteHeight = spriteSheet.height / 4;
  const row = SPRITE_ROWS[player.facing];
  const column = player.moving ? [0, 1, 2][Math.floor(performance.now() / 110) % 3] : 1;
  const sourceX = column * spriteWidth;
  const sourceY = row * spriteHeight;
  const px = player.renderX * TILE + (TILE - drawWidth) / 2;
  const py = player.renderY * TILE + TILE - drawHeight - 3;

  context.drawImage(
    spriteSheet,
    sourceX,
    sourceY,
    spriteWidth,
    spriteHeight,
    px,
    py,
    drawWidth,
    drawHeight,
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
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

    if (green > 210 && red < 120 && blue < 120) {
      data[index + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const clampedRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + clampedRadius, y);
  context.arcTo(x + width, y, x + width, y + height, clampedRadius);
  context.arcTo(x + width, y + height, x, y + height, clampedRadius);
  context.arcTo(x, y + height, x, y, clampedRadius);
  context.arcTo(x, y, x + width, y, clampedRadius);
  context.closePath();
  context.fill();
}

function forEachTile(
  map: TileType[][],
  tileType: TileType,
  callback: (x: number, y: number) => void,
) {
  for (let y = 0; y < getSceneHeightFromMap(map); y += 1) {
    for (let x = 0; x < getSceneWidthFromMap(map); x += 1) {
      if (map[y][x] === tileType) {
        callback(x, y);
      }
    }
  }
}

function attemptMove(game: GameState, move: MoveIntent, timestamp: number): GameState {
  const player = game.player;
  const scene = SCENES[game.sceneId];
  const nextX = player.tileX + move.dx;
  const nextY = player.tileY + move.dy;
  const nextTile = scene.map[nextY]?.[nextX];

  if (
    nextX < 0 ||
    nextY < 0 ||
    nextX >= getSceneWidth(scene) ||
    nextY >= getSceneHeight(scene) ||
    !nextTile ||
    BLOCKING_TILES.has(nextTile)
  ) {
    return player.facing === move.facing
      ? game
      : { ...game, player: { ...player, facing: move.facing } };
  }

  return {
    ...game,
    player: {
      ...player,
      facing: move.facing,
      startX: player.tileX,
      startY: player.tileY,
      targetX: nextX,
      targetY: nextY,
      renderX: player.tileX,
      renderY: player.tileY,
      moving: true,
      moveStartTime: timestamp,
    },
  };
}

function resolveDoorway(game: GameState, timestamp: number): GameState {
  const scene = SCENES[game.sceneId];
  const doorway = scene.doorways.find(
    (entry) => entry.x === game.player.tileX && entry.y === game.player.tileY,
  );

  if (!doorway) {
    return game;
  }

  return {
    sceneId: doorway.targetScene,
    cooldownUntil: timestamp + TELEPORT_COOLDOWN_MS,
    player: {
      tileX: doorway.spawnX,
      tileY: doorway.spawnY,
      renderX: doorway.spawnX,
      renderY: doorway.spawnY,
      startX: doorway.spawnX,
      startY: doorway.spawnY,
      targetX: doorway.spawnX,
      targetY: doorway.spawnY,
      facing: doorway.facing,
      moving: false,
      moveStartTime: 0,
    },
  };
}

function directionToMove(direction: Direction): MoveIntent | null {
  return Object.values(MOVEMENT_KEYS).find((move) => move.facing === direction) ?? null;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function isPathLike(map: TileType[][], x: number, y: number) {
  const tile = map[y]?.[x];
  return tile === 'path' || tile === 'door';
}

function getSceneWidth(scene: SceneConfig) {
  return getSceneWidthFromMap(scene.map);
}

function getSceneHeight(scene: SceneConfig) {
  return getSceneHeightFromMap(scene.map);
}

function getSceneWidthFromMap(map: TileType[][]) {
  return map[0]?.length ?? 0;
}

function getSceneHeightFromMap(map: TileType[][]) {
  return map.length;
}

export default App;
