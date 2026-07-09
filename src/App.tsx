import { useEffect, useMemo, useRef, useState } from 'react';

const TILE = 48;
const MAP_WIDTH = 16;
const MAP_HEIGHT = 12;
const STEP_DURATION_MS = 170;

const ASSET_SOURCES = {
  player: '/pokemonlike-fantasy/assets/generated/pack2/player-walk-sheet-chroma.png',
  house: '/pokemonlike-fantasy/assets/generated/pack2/house-chroma.png',
  tree: '/pokemonlike-fantasy/assets/generated/pack2/tree-chroma.png',
  pond: '/pokemonlike-fantasy/assets/generated/pack2/pond-chroma.png',
  foliage: '/pokemonlike-fantasy/assets/generated/pack2/foliage-chroma.png',
  fence: '/pokemonlike-fantasy/assets/generated/pack2/fence-chroma.png',
} as const;

type AssetKey = keyof typeof ASSET_SOURCES;
type Direction = 'up' | 'down' | 'left' | 'right';
type TileType =
  | 'grass'
  | 'path'
  | 'fence'
  | 'flowers'
  | 'water'
  | 'houseWall'
  | 'houseRoof'
  | 'door'
  | 'tree'
  | 'bush';
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
type AssetMap = Record<AssetKey, HTMLCanvasElement>;

const MAP: TileType[][] = [
  ['tree', 'tree', 'grass', 'grass', 'flowers', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'flowers', 'grass', 'tree', 'tree', 'tree'],
  ['tree', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'water', 'water', 'water', 'grass', 'grass', 'grass', 'tree', 'tree'],
  ['grass', 'grass', 'flowers', 'grass', 'grass', 'houseRoof', 'houseRoof', 'houseRoof', 'houseRoof', 'houseRoof', 'grass', 'grass', 'bush', 'grass', 'grass', 'tree'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'houseWall', 'houseWall', 'houseWall', 'houseWall', 'houseWall', 'grass', 'flowers', 'grass', 'grass', 'grass', 'grass'],
  ['grass', 'flowers', 'grass', 'grass', 'grass', 'houseWall', 'houseWall', 'door', 'houseWall', 'houseWall', 'grass', 'grass', 'grass', 'bush', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'path', 'path', 'path', 'path', 'path', 'grass', 'flowers', 'grass', 'grass', 'grass', 'grass'],
  ['grass', 'bush', 'grass', 'fence', 'fence', 'path', 'grass', 'grass', 'grass', 'path', 'grass', 'grass', 'grass', 'tree', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'path', 'grass', 'grass', 'flowers', 'path', 'path', 'path', 'path', 'grass', 'grass', 'grass'],
  ['grass', 'flowers', 'grass', 'bush', 'grass', 'path', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'path', 'grass', 'water', 'water'],
  ['tree', 'grass', 'grass', 'flowers', 'grass', 'path', 'grass', 'tree', 'grass', 'flowers', 'grass', 'grass', 'path', 'grass', 'water', 'water'],
  ['tree', 'grass', 'grass', 'grass', 'grass', 'path', 'path', 'path', 'path', 'path', 'path', 'path', 'path', 'grass', 'grass', 'grass'],
  ['tree', 'tree', 'grass', 'grass', 'flowers', 'grass', 'grass', 'flowers', 'grass', 'grass', 'bush', 'grass', 'grass', 'grass', 'tree', 'tree'],
];

const BLOCKING_TILES = new Set<TileType>([
  'water',
  'fence',
  'houseWall',
  'houseRoof',
  'tree',
  'bush',
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
  const [assetsReady, setAssetsReady] = useState(false);
  const [player, setPlayer] = useState<PlayerState>({
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
  });
  const heldDirectionRef = useRef<Direction | null>(null);
  const bufferedDirectionRef = useRef<Direction | null>(null);

  const canvasSize = useMemo(
    () => ({ width: MAP_WIDTH * TILE, height: MAP_HEIGHT * TILE }),
    [],
  );

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

      setPlayer((current) => {
        if (current.moving) {
          return current.facing === nextMove.facing
            ? current
            : { ...current, facing: nextMove.facing };
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
      setPlayer((current) => {
        if (!current.moving) {
          const nextDirection = bufferedDirectionRef.current ?? heldDirectionRef.current;
          if (!nextDirection) return current;
          const nextMove = directionToMove(nextDirection);
          return nextMove ? attemptMove(current, nextMove, timestamp) : current;
        }

        const elapsed = timestamp - current.moveStartTime;
        const progress = Math.min(elapsed / STEP_DURATION_MS, 1);
        const nextRenderX = lerp(current.startX, current.targetX, progress);
        const nextRenderY = lerp(current.startY, current.targetY, progress);

        if (progress < 1) {
          return {
            ...current,
            renderX: nextRenderX,
            renderY: nextRenderY,
          };
        }

        const settledState: PlayerState = {
          ...current,
          tileX: current.targetX,
          tileY: current.targetY,
          renderX: current.targetX,
          renderY: current.targetY,
          startX: current.targetX,
          startY: current.targetY,
          moving: false,
        };

        const nextDirection = bufferedDirectionRef.current ?? heldDirectionRef.current;
        if (!nextDirection) {
          return settledState;
        }

        const nextMove = directionToMove(nextDirection);
        return nextMove ? attemptMove(settledState, nextMove, timestamp) : settledState;
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

    renderScene(context, assets, player);
  }, [assetsReady, player]);

  return (
    <main className="app-shell">
      <section className="intro-card">
        <p className="eyebrow">Round 2</p>
        <h1>Vrai pack modulaire + marche animée</h1>
        <p className="description">
          Le prototype utilise maintenant des éléments séparés pour le décor, un meilleur sprite
          joueur plus top-down, et une vraie animation de marche.
        </p>
        <div className="tips">
          <span>Déplacement: flèches, ZQSD ou WASD</span>
          <span>Assets séparés: maison, arbres, étangs, feuillages, clôtures</span>
          <span>Marche animée: 12 frames joueur</span>
        </div>
      </section>

      <section className="game-frame">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          aria-label="Carte de départ"
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

function renderScene(context: CanvasRenderingContext2D, assets: AssetMap, player: PlayerState) {
  context.imageSmoothingEnabled = true;
  drawGround(context);
  drawPonds(context, assets.pond);
  drawPathNetwork(context);
  drawHouse(context, assets.house);
  drawFences(context, assets.fence);
  drawFoliage(context, assets.foliage);
  drawTrees(context, assets.tree);
  drawPlayerShadow(context, player.renderX, player.renderY);
  drawPlayerSprite(context, assets.player, player);
}

function drawGround(context: CanvasRenderingContext2D) {
  const width = MAP_WIDTH * TILE;
  const height = MAP_HEIGHT * TILE;
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#ddf4ff');
  sky.addColorStop(0.24, '#dff6d7');
  sky.addColorStop(1, '#a6dc79');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const px = x * TILE;
      const py = y * TILE;
      const fill = context.createLinearGradient(px, py, px, py + TILE);
      fill.addColorStop(0, '#9ce173');
      fill.addColorStop(1, '#6dbe58');
      context.fillStyle = fill;
      fillRoundedRect(context, px, py, TILE, TILE, 14);

      context.fillStyle = (x + y) % 2 === 0 ? 'rgba(241,255,207,0.14)' : 'rgba(57,114,48,0.07)';
      fillRoundedRect(context, px + 1, py + 1, TILE - 2, TILE - 2, 14);

      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.beginPath();
      context.ellipse(px + 14, py + 14, 8, 4, -0.2, 0, Math.PI * 2);
      context.ellipse(px + 30, py + 31, 7, 3, 0.18, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawPathNetwork(context: CanvasRenderingContext2D) {
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (!isPathLike(x, y)) continue;

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

      if (isPathLike(x + 1, y)) {
        drawPathLink(context, centerX, centerY, centerX + TILE / 2, centerY);
      }
      if (isPathLike(x, y + 1)) {
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

function drawHouse(context: CanvasRenderingContext2D, house: HTMLCanvasElement) {
  const drawWidth = 314;
  const drawHeight = 240;
  const x = 214;
  const y = 18;

  context.fillStyle = 'rgba(73, 55, 37, 0.16)';
  context.beginPath();
  context.ellipse(x + drawWidth / 2, y + drawHeight - 14, 88, 18, 0, 0, Math.PI * 2);
  context.fill();

  context.drawImage(house, x, y, drawWidth, drawHeight);
}

function drawPonds(context: CanvasRenderingContext2D, pond: HTMLCanvasElement) {
  context.drawImage(pond, 414, 32, 232, 232);
  context.drawImage(pond, 580, 344, 164, 164);
}

function drawFences(context: CanvasRenderingContext2D, fence: HTMLCanvasElement) {
  forEachTile('fence', (x, y) => {
    const px = x * TILE - 18;
    const py = y * TILE + 11;
    context.drawImage(fence, px, py, 92, 34);
  });
}

function drawFoliage(context: CanvasRenderingContext2D, foliage: HTMLCanvasElement) {
  forEachTile('bush', (x, y) => {
    const px = x * TILE - 10;
    const py = y * TILE + 2;
    context.drawImage(foliage, px, py, 72, 72);
  });

  forEachTile('flowers', (x, y) => {
    const px = x * TILE - 2;
    const py = y * TILE + 8;
    context.save();
    context.globalAlpha = 0.95;
    context.drawImage(foliage, px, py, 58, 58);
    context.restore();
  });
}

function drawTrees(context: CanvasRenderingContext2D, tree: HTMLCanvasElement) {
  forEachTile('tree', (x, y) => {
    const px = x * TILE - 28;
    const py = y * TILE - 34;
    context.drawImage(tree, px, py, 108, 108);
  });
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
) {
  const spriteWidth = spriteSheet.width / 3;
  const spriteHeight = spriteSheet.height / 4;
  const row = SPRITE_ROWS[player.facing];
  const column = player.moving ? [0, 1, 2][Math.floor(performance.now() / 110) % 3] : 1;
  const sourceX = column * spriteWidth;
  const sourceY = row * spriteHeight;
  const drawWidth = 46;
  const drawHeight = 46;
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

    if (green > 210 && red < 100 && blue < 100) {
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

function forEachTile(tileType: TileType, callback: (x: number, y: number) => void) {
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (MAP[y][x] === tileType) {
        callback(x, y);
      }
    }
  }
}

function attemptMove(player: PlayerState, move: MoveIntent, timestamp: number): PlayerState {
  const nextX = player.tileX + move.dx;
  const nextY = player.tileY + move.dy;
  const nextTile = MAP[nextY]?.[nextX];

  if (
    nextX < 0 ||
    nextY < 0 ||
    nextX >= MAP_WIDTH ||
    nextY >= MAP_HEIGHT ||
    !nextTile ||
    BLOCKING_TILES.has(nextTile)
  ) {
    return player.facing === move.facing ? player : { ...player, facing: move.facing };
  }

  return {
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
  };
}

function directionToMove(direction: Direction): MoveIntent | null {
  return Object.values(MOVEMENT_KEYS).find((move) => move.facing === direction) ?? null;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function isPathLike(x: number, y: number) {
  const tile = MAP[y]?.[x];
  return tile === 'path' || tile === 'door';
}

export default App;
