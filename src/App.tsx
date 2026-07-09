import { useEffect, useMemo, useRef, useState } from 'react';

const TILE = 48;
const MAP_WIDTH = 16;
const MAP_HEIGHT = 12;
const STEP_DURATION_MS = 170;

type Direction = 'up' | 'down' | 'left' | 'right';
type TileType = 'grass' | 'path' | 'fence' | 'flowers' | 'water' | 'houseWall' | 'houseRoof' | 'door';
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
  ['grass', 'grass', 'grass', 'grass', 'flowers', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'flowers', 'grass', 'grass', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'water', 'water', 'grass', 'grass', 'grass', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'houseRoof', 'houseRoof', 'houseRoof', 'houseRoof', 'houseRoof', 'grass', 'grass', 'flowers', 'grass', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'houseWall', 'houseWall', 'houseWall', 'houseWall', 'houseWall', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'houseWall', 'houseWall', 'door', 'houseWall', 'houseWall', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'path', 'path', 'path', 'path', 'path', 'grass', 'flowers', 'grass', 'grass', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'path', 'grass', 'grass', 'grass', 'path', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
  ['grass', 'grass', 'fence', 'fence', 'fence', 'path', 'fence', 'fence', 'grass', 'path', 'path', 'path', 'path', 'grass', 'grass', 'grass'],
  ['grass', 'flowers', 'grass', 'grass', 'grass', 'path', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'path', 'grass', 'water', 'water'],
  ['grass', 'grass', 'grass', 'flowers', 'grass', 'path', 'grass', 'grass', 'flowers', 'grass', 'grass', 'grass', 'path', 'grass', 'water', 'water'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'path', 'path', 'path', 'path', 'path', 'path', 'path', 'path', 'grass', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'flowers', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
];

const BLOCKING_TILES = new Set<TileType>(['water', 'fence', 'houseWall', 'houseRoof']);
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
  const playerRef = useRef(player);

  const canvasSize = useMemo(
    () => ({ width: MAP_WIDTH * TILE, height: MAP_HEIGHT * TILE }),
    [],
  );

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

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
    drawPlayer(context, player.renderX, player.renderY, player.facing);
  }, [player]);

  return (
    <main className="app-shell">
      <section className="intro-card">
        <p className="eyebrow">Proto 2D</p>
        <h1>Pokemonlike fantasy mignon</h1>
        <p className="description">
          Première zone jouable: une petite maison, un chemin, un étang, et un héros vu de haut
          qui se tourne dans les quatre directions.
        </p>
        <div className="tips">
          <span>Déplacement: flèches, ZQSD ou WASD</span>
          <span>Le perso glisse maintenant d’une case à l’autre comme dans Pokemon</span>
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

  context.fillStyle = '#81d46b';
  context.fillRect(px, py, TILE, TILE);

  context.fillStyle = '#6ac35b';
  context.fillRect(px, py + TILE / 2, TILE, TILE / 2);

  if (tile === 'grass') {
    drawGrassDetail(context, px, py);
    return;
  }

  if (tile === 'flowers') {
    drawGrassDetail(context, px, py);
    context.fillStyle = '#fdf0ff';
    context.fillRect(px + 12, py + 14, 6, 6);
    context.fillStyle = '#ffd166';
    context.fillRect(px + 24, py + 24, 6, 6);
    context.fillStyle = '#ff9ec4';
    context.fillRect(px + 32, py + 12, 6, 6);
    return;
  }

  if (tile === 'path' || tile === 'door') {
    context.fillStyle = tile === 'door' ? '#7a4c2f' : '#caa46d';
    context.fillRect(px, py, TILE, TILE);
    context.fillStyle = tile === 'door' ? '#5b3824' : '#b68e58';
    context.fillRect(px, py + TILE / 2, TILE, TILE / 2);
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fillRect(px + 6, py + 8, TILE - 12, 6);
    return;
  }

  if (tile === 'water') {
    context.fillStyle = '#5bc0eb';
    context.fillRect(px, py, TILE, TILE);
    context.fillStyle = '#72d6ff';
    context.fillRect(px, py, TILE, 12);
    context.fillStyle = 'rgba(255,255,255,0.35)';
    context.fillRect(px + 8, py + 14, 20, 4);
    context.fillRect(px + 18, py + 28, 16, 4);
    return;
  }

  if (tile === 'fence') {
    drawGrassDetail(context, px, py);
    context.fillStyle = '#b37a44';
    context.fillRect(px + 6, py + 10, 6, TILE - 12);
    context.fillRect(px + 20, py + 8, 6, TILE - 10);
    context.fillRect(px + 34, py + 10, 6, TILE - 12);
    context.fillRect(px + 2, py + 14, TILE - 4, 5);
    return;
  }

  if (tile === 'houseWall') {
    context.fillStyle = '#f8e9c8';
    context.fillRect(px, py, TILE, TILE);
    context.fillStyle = '#e0c99e';
    context.fillRect(px, py + TILE - 10, TILE, 10);
    context.fillStyle = '#c98d4e';
    context.fillRect(px + 6, py + 8, TILE - 12, TILE - 20);
    context.fillStyle = '#fff7e2';
    context.fillRect(px + 10, py + 12, TILE - 20, TILE - 28);
    return;
  }

  if (tile === 'houseRoof') {
    context.fillStyle = '#ef6c63';
    context.fillRect(px, py, TILE, TILE);
    context.fillStyle = '#d65248';
    context.beginPath();
    context.moveTo(px, py + TILE);
    context.lineTo(px + TILE / 2, py + 8);
    context.lineTo(px + TILE, py + TILE);
    context.closePath();
    context.fill();
  }
}

function drawGrassDetail(context: CanvasRenderingContext2D, px: number, py: number) {
  context.fillStyle = '#59ae4e';
  context.fillRect(px + 6, py + 8, 5, 10);
  context.fillRect(px + 30, py + 16, 5, 11);
  context.fillRect(px + 22, py + 34, 4, 8);
}

function drawShadow(context: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const centerX = tileX * TILE + TILE / 2;
  const centerY = tileY * TILE + TILE - 10;

  context.fillStyle = 'rgba(26, 24, 38, 0.18)';
  context.beginPath();
  context.ellipse(centerX, centerY, 14, 7, 0, 0, Math.PI * 2);
  context.fill();
}

function drawPlayer(context: CanvasRenderingContext2D, tileX: number, tileY: number, facing: Direction) {
  const px = tileX * TILE;
  const py = tileY * TILE;
  const centerX = px + TILE / 2;
  const centerY = py + TILE / 2;

  context.fillStyle = '#6b3fa0';
  context.fillRect(px + 15, py + 16, 18, 16);

  context.fillStyle = '#ffe5c4';
  context.fillRect(px + 14, py + 10, 20, 14);

  context.fillStyle = '#8a5adf';
  context.fillRect(px + 12, py + 8, 24, 8);

  context.fillStyle = '#5f8ef6';
  context.fillRect(px + 16, py + 30, 6, 10);
  context.fillRect(px + 26, py + 30, 6, 10);

  context.fillStyle = '#5d341d';
  if (facing === 'up') {
    context.fillRect(px + 16, py + 12, 18, 8);
  } else if (facing === 'down') {
    context.fillRect(px + 16, py + 12, 18, 4);
    context.fillStyle = '#222';
    context.fillRect(px + 18, py + 18, 3, 3);
    context.fillRect(px + 27, py + 18, 3, 3);
  } else if (facing === 'left') {
    context.fillRect(px + 14, py + 12, 18, 8);
    context.fillStyle = '#222';
    context.fillRect(px + 17, py + 18, 3, 3);
  } else {
    context.fillRect(px + 16, py + 12, 18, 8);
    context.fillStyle = '#222';
    context.fillRect(px + 28, py + 18, 3, 3);
  }

  context.strokeStyle = 'rgba(255,255,255,0.2)';
  context.lineWidth = 2;
  context.strokeRect(px + 15, py + 16, 18, 16);

  context.fillStyle = '#ffd166';
  context.fillRect(centerX - 2, centerY + 14, 4, 4);
}

export default App;
