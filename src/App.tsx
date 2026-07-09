import { useEffect, useMemo, useRef, useState } from 'react';

const TILE = 48;
const MAP_WIDTH = 16;
const MAP_HEIGHT = 12;
const STEP_DURATION_MS = 170;
const BACKGROUND_SRC = '/pokemonlike-fantasy/assets/generated/starter-village-bg.png';
const PLAYER_SHEET_SRC = '/pokemonlike-fantasy/assets/generated/player-sheet-chroma.png';

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

const SPRITE_ORDER: Record<Direction, { col: number; row: number }> = {
  down: { col: 0, row: 0 },
  right: { col: 1, row: 0 },
  left: { col: 0, row: 1 },
  up: { col: 1, row: 1 },
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundRef = useRef<HTMLImageElement | null>(null);
  const playerSheetRef = useRef<HTMLCanvasElement | null>(null);
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

    Promise.all([loadImage(BACKGROUND_SRC), loadImage(PLAYER_SHEET_SRC)]).then(
      ([background, playerSheet]) => {
        if (cancelled) return;
        backgroundRef.current = background;
        playerSheetRef.current = removeGreenScreen(playerSheet);
        setAssetsReady(true);
      },
    );

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
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (assetsReady && backgroundRef.current && playerSheetRef.current) {
      context.imageSmoothingEnabled = true;
      context.drawImage(backgroundRef.current, 0, 0, canvas.width, canvas.height);
      drawPlayerShadow(context, player.renderX, player.renderY);
      drawPlayerSprite(context, playerSheetRef.current, player.renderX, player.renderY, player.facing);
      return;
    }

    context.fillStyle = '#85cf73';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, [assetsReady, player]);

  return (
    <main className="app-shell">
      <section className="intro-card">
        <p className="eyebrow">AI Art Pass</p>
        <h1>Enfin de vrais assets</h1>
        <p className="description">
          Le décor principal et le premier sprite joueur viennent maintenant d’un vrai lot d’assets
          générés puis intégrés au prototype.
        </p>
        <div className="tips">
          <span>Déplacement: flèches, ZQSD ou WASD</span>
          <span>Fond illustré + sprite IA intégrés dans le jeu</span>
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

    if (green > 220 && red < 80 && blue < 80) {
      data[index + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function drawPlayerShadow(context: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const centerX = tileX * TILE + TILE / 2;
  const centerY = tileY * TILE + TILE - 7;

  context.fillStyle = 'rgba(26, 29, 22, 0.18)';
  context.beginPath();
  context.ellipse(centerX, centerY, 12, 6, 0, 0, Math.PI * 2);
  context.fill();
}

function drawPlayerSprite(
  context: CanvasRenderingContext2D,
  spriteSheet: HTMLCanvasElement,
  tileX: number,
  tileY: number,
  facing: Direction,
) {
  const spriteWidth = spriteSheet.width / 2;
  const spriteHeight = spriteSheet.height / 2;
  const frame = SPRITE_ORDER[facing];
  const sourceX = frame.col * spriteWidth;
  const sourceY = frame.row * spriteHeight;
  const drawWidth = 42;
  const drawHeight = 42;
  const px = tileX * TILE + (TILE - drawWidth) / 2;
  const py = tileY * TILE + TILE - drawHeight - 2;

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

export default App;
