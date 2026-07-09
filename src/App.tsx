import { useEffect, useMemo, useRef, useState } from 'react';

const TILE = 48;
const MAP_WIDTH = 16;
const MAP_HEIGHT = 12;
const STEP_DURATION_MS = 170;

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

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        drawTile(context, MAP[y][x], x, y);
      }
    }

    drawShadow(context, player.renderX, player.renderY);
    drawPlayer(context, player.renderX, player.renderY, player.facing, player.moving);
  }, [player]);

  return (
    <main className="app-shell">
      <section className="intro-card">
        <p className="eyebrow">Village de départ</p>
        <h1>Conte pixel mignon</h1>
        <p className="description">
          Refonte visuelle de la première zone: palette plus riche, végétation plus dense, eau plus
          douce et maison plus vivante pour approcher le charme du visuel de référence.
        </p>
        <div className="tips">
          <span>Déplacement: flèches, ZQSD ou WASD</span>
          <span>Le héros glisse case par case comme dans un vrai Pokemon-like</span>
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

function drawTile(context: CanvasRenderingContext2D, tile: TileType, x: number, y: number) {
  const px = x * TILE;
  const py = y * TILE;

  drawGroundBase(context, px, py, x, y);

  switch (tile) {
    case 'grass':
      drawGrassDetail(context, px, py, x, y);
      break;
    case 'flowers':
      drawGrassDetail(context, px, py, x, y);
      drawFlowerPatch(context, px, py);
      break;
    case 'path':
      drawPathTile(context, px, py, x, y);
      break;
    case 'door':
      drawDoorTile(context, px, py);
      break;
    case 'water':
      drawWaterTile(context, px, py, x, y);
      break;
    case 'fence':
      drawFenceTile(context, px, py);
      break;
    case 'houseWall':
      drawHouseWall(context, px, py, x, y);
      break;
    case 'houseRoof':
      drawHouseRoof(context, px, py, x, y);
      break;
    case 'tree':
      drawTree(context, px, py, x, y);
      break;
    case 'bush':
      drawBush(context, px, py);
      break;
  }
}

function drawGroundBase(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  x: number,
  y: number,
) {
  context.fillStyle = '#6ebf5e';
  context.fillRect(px, py, TILE, TILE);

  context.fillStyle = '#78c969';
  context.fillRect(px, py + TILE / 2, TILE, TILE / 2);

  context.fillStyle = (x + y) % 2 === 0 ? 'rgba(168, 224, 130, 0.25)' : 'rgba(57, 117, 66, 0.12)';
  context.fillRect(px, py, TILE, TILE);

  context.fillStyle = 'rgba(241, 255, 210, 0.18)';
  context.fillRect(px + 4, py + 6, 12, 6);
  context.fillRect(px + 26, py + 30, 10, 5);
}

function drawGrassDetail(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  x: number,
  y: number,
) {
  const offset = ((x * 7 + y * 11) % 5) * 2;

  context.fillStyle = '#4e9b45';
  context.fillRect(px + 6, py + 26 - offset / 2, 5, 10 + offset / 2);
  context.fillRect(px + 16, py + 14, 4, 8);
  context.fillRect(px + 30, py + 18 + offset / 2, 5, 11);
  context.fillRect(px + 22, py + 34, 4, 8);

  context.fillStyle = 'rgba(211, 255, 177, 0.35)';
  context.fillRect(px + 10, py + 8, 8, 3);
  context.fillRect(px + 28, py + 10, 6, 3);
}

function drawFlowerPatch(context: CanvasRenderingContext2D, px: number, py: number) {
  const flowers = [
    { x: 10, y: 14, color: '#fff0f6' },
    { x: 18, y: 28, color: '#ffd166' },
    { x: 28, y: 18, color: '#ff8eb8' },
    { x: 34, y: 30, color: '#c8f07a' },
  ];

  flowers.forEach(({ x, y, color }) => {
    context.fillStyle = '#48783a';
    context.fillRect(px + x + 1, py + y + 4, 2, 5);
    context.fillStyle = color;
    context.fillRect(px + x, py + y, 4, 4);
  });
}

function drawPathTile(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  x: number,
  y: number,
) {
  context.fillStyle = '#b78d5e';
  context.fillRect(px, py, TILE, TILE);
  context.fillStyle = '#a67a4b';
  context.fillRect(px, py + TILE / 2, TILE, TILE / 2);

  context.fillStyle = 'rgba(239, 220, 177, 0.85)';
  context.fillRect(px + 4, py + 8, 14, 8);
  context.fillRect(px + 22, py + 18, 18, 8);
  context.fillRect(px + 10, py + 30, 22, 8);

  if (isPathLike(x, y - 1)) {
    context.fillRect(px + 16, py, 16, 12);
  }
  if (isPathLike(x, y + 1)) {
    context.fillRect(px + 16, py + 36, 16, 12);
  }
  if (isPathLike(x - 1, y)) {
    context.fillRect(px, py + 16, 12, 16);
  }
  if (isPathLike(x + 1, y)) {
    context.fillRect(px + 36, py + 16, 12, 16);
  }
}

function drawDoorTile(context: CanvasRenderingContext2D, px: number, py: number) {
  context.fillStyle = '#7c5233';
  context.fillRect(px + 8, py + 6, TILE - 16, TILE - 6);
  context.fillStyle = '#5d3924';
  context.fillRect(px + 14, py + 12, TILE - 28, TILE - 12);
  context.fillStyle = '#f1c46d';
  context.fillRect(px + TILE - 16, py + 24, 4, 4);
}

function drawWaterTile(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  x: number,
  y: number,
) {
  context.fillStyle = '#4da9d9';
  context.fillRect(px, py, TILE, TILE);
  context.fillStyle = '#74cdee';
  context.fillRect(px, py, TILE, 12);
  context.fillStyle = '#2d7dac';
  context.fillRect(px, py + TILE - 6, TILE, 6);

  if (!isWater(x, y - 1)) {
    context.fillStyle = '#a7e8ff';
    context.fillRect(px, py, TILE, 8);
  }
  if (!isWater(x - 1, y)) {
    context.fillStyle = 'rgba(199, 243, 255, 0.75)';
    context.fillRect(px, py, 6, TILE);
  }

  context.fillStyle = 'rgba(255,255,255,0.45)';
  context.fillRect(px + 8, py + 14, 18, 4);
  context.fillRect(px + 22, py + 28, 12, 4);

  context.fillStyle = '#8bd16f';
  context.fillRect(px + 30, py + 18, 8, 6);
  context.fillStyle = '#ffe7f4';
  context.fillRect(px + 32, py + 16, 4, 4);
}

function drawFenceTile(context: CanvasRenderingContext2D, px: number, py: number) {
  drawGrassDetail(context, px, py, 0, 0);
  context.fillStyle = '#8d603a';
  context.fillRect(px + 6, py + 10, 6, TILE - 12);
  context.fillRect(px + 20, py + 8, 6, TILE - 10);
  context.fillRect(px + 34, py + 10, 6, TILE - 12);
  context.fillStyle = '#b98556';
  context.fillRect(px + 2, py + 14, TILE - 4, 5);
  context.fillRect(px + 4, py + 26, TILE - 8, 5);
}

function drawHouseWall(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  x: number,
  y: number,
) {
  context.fillStyle = '#f0dfbc';
  context.fillRect(px, py, TILE, TILE);
  context.fillStyle = '#e2ca9d';
  context.fillRect(px, py + TILE - 10, TILE, 10);
  context.fillStyle = '#c28c4c';
  context.fillRect(px, py + 2, TILE, 6);

  if (y === 3 && (x === 6 || x === 8)) {
    context.fillStyle = '#8ec8ea';
    context.fillRect(px + 10, py + 12, TILE - 20, 14);
    context.fillStyle = '#f8f2de';
    context.fillRect(px + 8, py + 10, TILE - 16, 2);
    context.fillRect(px + 8, py + 26, TILE - 16, 2);
    context.fillRect(px + 8, py + 10, 2, 18);
    context.fillRect(px + TILE - 10, py + 10, 2, 18);
  } else {
    context.fillStyle = '#fff5dc';
    context.fillRect(px + 8, py + 12, TILE - 16, TILE - 22);
  }
}

function drawHouseRoof(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  x: number,
  y: number,
) {
  context.fillStyle = '#d95f52';
  context.fillRect(px, py, TILE, TILE);
  context.fillStyle = '#be4a45';
  context.fillRect(px, py + TILE - 8, TILE, 8);
  context.fillStyle = '#f58e76';
  context.fillRect(px + 2, py + 4, TILE - 4, 6);

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      context.fillStyle = (row + col + x + y) % 2 === 0 ? '#e97961' : '#cc584d';
      context.fillRect(px + 2 + col * 11, py + 12 + row * 10, 10, 8);
    }
  }
}

function drawTree(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  x: number,
  y: number,
) {
  drawGrassDetail(context, px, py, x, y);

  context.fillStyle = '#6f4728';
  context.fillRect(px + 18, py + 24, 12, 18);
  context.fillStyle = '#8d5b34';
  context.fillRect(px + 22, py + 28, 4, 14);

  context.fillStyle = '#3e8b44';
  context.beginPath();
  context.arc(px + 16, py + 20, 12, 0, Math.PI * 2);
  context.arc(px + 30, py + 16, 14, 0, Math.PI * 2);
  context.arc(px + 24, py + 10, 12, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#62b85e';
  context.fillRect(px + 10, py + 10, 10, 8);
  context.fillRect(px + 24, py + 8, 8, 6);
}

function drawBush(context: CanvasRenderingContext2D, px: number, py: number) {
  drawGrassDetail(context, px, py, 0, 0);
  context.fillStyle = '#4d984b';
  context.beginPath();
  context.arc(px + 12, py + 30, 10, 0, Math.PI * 2);
  context.arc(px + 24, py + 26, 12, 0, Math.PI * 2);
  context.arc(px + 36, py + 30, 10, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#79c76a';
  context.fillRect(px + 10, py + 20, 9, 5);
  context.fillRect(px + 25, py + 18, 8, 5);
}

function drawShadow(context: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const centerX = tileX * TILE + TILE / 2;
  const centerY = tileY * TILE + TILE - 10;

  context.fillStyle = 'rgba(20, 28, 18, 0.2)';
  context.beginPath();
  context.ellipse(centerX, centerY, 14, 7, 0, 0, Math.PI * 2);
  context.fill();
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  facing: Direction,
  moving: boolean,
) {
  const px = tileX * TILE;
  const py = tileY * TILE;
  const bob = moving ? 1 : 0;

  context.fillStyle = '#5f78d8';
  context.fillRect(px + 15, py + 28 - bob, 7, 11);
  context.fillRect(px + 26, py + 28 + bob, 7, 11);

  context.fillStyle = '#4a2c7a';
  context.fillRect(px + 13, py + 16, 22, 15);
  context.fillStyle = '#7a4bd2';
  context.fillRect(px + 15, py + 18, 18, 11);

  context.fillStyle = '#ffe1bf';
  context.fillRect(px + 14, py + 10, 20, 13);

  context.fillStyle = '#8e5be8';
  context.fillRect(px + 12, py + 8, 24, 7);
  context.fillStyle = '#f7c85c';
  context.fillRect(px + 18, py + 8, 12, 3);

  context.fillStyle = '#6c4329';
  if (facing === 'up') {
    context.fillRect(px + 15, py + 12, 18, 9);
    context.fillStyle = '#b8874d';
    context.fillRect(px + 18, py + 21, 12, 2);
  } else if (facing === 'down') {
    context.fillRect(px + 15, py + 12, 18, 4);
    context.fillStyle = '#1f1d26';
    context.fillRect(px + 18, py + 18, 3, 3);
    context.fillRect(px + 27, py + 18, 3, 3);
    context.fillStyle = '#ffb6b3';
    context.fillRect(px + 22, py + 21, 4, 2);
  } else if (facing === 'left') {
    context.fillRect(px + 13, py + 12, 17, 8);
    context.fillStyle = '#1f1d26';
    context.fillRect(px + 17, py + 18, 3, 3);
  } else {
    context.fillRect(px + 18, py + 12, 17, 8);
    context.fillStyle = '#1f1d26';
    context.fillRect(px + 28, py + 18, 3, 3);
  }

  context.fillStyle = '#f6e7ff';
  context.fillRect(px + 17, py + 22, 14, 4);
}

function isPathLike(x: number, y: number) {
  const tile = MAP[y]?.[x];
  return tile === 'path' || tile === 'door';
}

function isWater(x: number, y: number) {
  return MAP[y]?.[x] === 'water';
}

export default App;
