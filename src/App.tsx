import { useEffect, useMemo, useRef, useState } from 'react';

const TILE = 48;
const MAP_WIDTH = 16;
const MAP_HEIGHT = 12;
const STEP_DURATION_MS = 170;
const HOUSE = {
  roofStartX: 5,
  roofEndX: 10,
  roofY: 2,
  wallStartX: 5,
  wallEndX: 10,
  wallTopY: 3,
  wallBottomY: 5,
  doorX: 7,
  doorY: 4,
};

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

    context.imageSmoothingEnabled = true;
    renderScene(context, player);
  }, [player]);

  return (
    <main className="app-shell">
      <section className="intro-card">
        <p className="eyebrow">Starter Village</p>
        <h1>Version plus propre, enfin</h1>
        <p className="description">
          Même map, même déplacement, mais avec un rendu plus doux et plus lisible pour tester sans
          se faire agresser par le décor.
        </p>
        <div className="tips">
          <span>Déplacement: flèches, ZQSD ou WASD</span>
          <span>Objectif: top-down fantasy plus lisse, moins proto bricolé</span>
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

function renderScene(context: CanvasRenderingContext2D, player: PlayerState) {
  context.clearRect(0, 0, MAP_WIDTH * TILE, MAP_HEIGHT * TILE);

  drawAmbientBackground(context);
  drawGround(context);
  drawPathNetwork(context);
  drawWater(context);
  drawHouse(context);
  drawFences(context);
  drawBushes(context);
  drawFlowers(context);
  drawTrees(context);
  drawPlayerShadow(context, player.renderX, player.renderY);
  drawPlayer(context, player.renderX, player.renderY, player.facing, player.moving);
}

function drawAmbientBackground(context: CanvasRenderingContext2D) {
  const width = MAP_WIDTH * TILE;
  const height = MAP_HEIGHT * TILE;

  const skyGlow = context.createLinearGradient(0, 0, 0, height);
  skyGlow.addColorStop(0, '#d6f2ff');
  skyGlow.addColorStop(0.28, '#edf9f2');
  skyGlow.addColorStop(1, '#9cda7a');
  context.fillStyle = skyGlow;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.beginPath();
  context.arc(140, 80, 110, 0, Math.PI * 2);
  context.arc(610, 120, 90, 0, Math.PI * 2);
  context.fill();
}

function drawGround(context: CanvasRenderingContext2D) {
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const px = x * TILE;
      const py = y * TILE;
      const base = context.createLinearGradient(px, py, px, py + TILE);
      base.addColorStop(0, '#95dc74');
      base.addColorStop(1, '#69bc58');
      context.fillStyle = base;
      fillRoundedRect(context, px, py, TILE, TILE, 12);

      context.fillStyle = (x + y) % 2 === 0 ? 'rgba(193, 244, 159, 0.18)' : 'rgba(56, 122, 61, 0.08)';
      fillRoundedRect(context, px + 1, py + 1, TILE - 2, TILE - 2, 12);

      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.beginPath();
      context.ellipse(px + 14, py + 12, 9, 5, -0.25, 0, Math.PI * 2);
      context.ellipse(px + 33, py + 31, 8, 4, 0.2, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = 'rgba(58, 120, 57, 0.12)';
      context.lineWidth = 1;
      strokeRoundedRect(context, px + 0.5, py + 0.5, TILE - 1, TILE - 1, 12);
    }
  }
}

function drawPathNetwork(context: CanvasRenderingContext2D) {
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (!isPathLike(x, y)) continue;

      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;

      context.fillStyle = '#ccb185';
      context.beginPath();
      context.arc(cx, cy, 17, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#e7d1ab';
      context.beginPath();
      context.arc(cx - 2, cy - 3, 11, 0, Math.PI * 2);
      context.fill();

      if (isPathLike(x + 1, y)) {
        drawPathConnection(context, cx, cy, cx + TILE / 2, cy);
      }
      if (isPathLike(x, y + 1)) {
        drawPathConnection(context, cx, cy, cx, cy + TILE / 2);
      }
    }
  }
}

function drawPathConnection(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  context.strokeStyle = '#ccb185';
  context.lineWidth = 34;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();

  context.strokeStyle = '#ead9b8';
  context.lineWidth = 22;
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();
}

function drawWater(context: CanvasRenderingContext2D) {
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (!isWater(x, y)) continue;

      const px = x * TILE;
      const py = y * TILE;
      const water = context.createLinearGradient(px, py, px, py + TILE);
      water.addColorStop(0, '#8fe7ff');
      water.addColorStop(1, '#3ca6d7');
      context.fillStyle = water;
      fillRoundedRect(context, px + 2, py + 2, TILE - 4, TILE - 4, 18);

      if (isWater(x + 1, y)) {
        fillRoundedRect(context, px + TILE / 2, py + 6, TILE / 2 + 8, TILE - 12, 18);
      }
      if (isWater(x, y + 1)) {
        fillRoundedRect(context, px + 6, py + TILE / 2, TILE - 12, TILE / 2 + 8, 18);
      }

      context.fillStyle = 'rgba(255,255,255,0.38)';
      context.beginPath();
      context.ellipse(px + 18, py + 15, 10, 4, -0.2, 0, Math.PI * 2);
      context.ellipse(px + 31, py + 27, 7, 3, 0.25, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#e8fff5';
      context.beginPath();
      context.arc(px + 32, py + 17, 2.5, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawHouse(context: CanvasRenderingContext2D) {
  const x = HOUSE.wallStartX * TILE;
  const roofY = HOUSE.roofY * TILE + 4;
  const wallY = HOUSE.wallTopY * TILE + 8;
  const width = (HOUSE.wallEndX - HOUSE.wallStartX) * TILE;
  const wallHeight = (HOUSE.wallBottomY - HOUSE.wallTopY) * TILE - 10;

  context.fillStyle = 'rgba(69, 54, 42, 0.16)';
  context.beginPath();
  context.ellipse(x + width / 2, wallY + wallHeight + 10, width / 2 - 12, 14, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#dd6157';
  context.beginPath();
  context.moveTo(x - 8, roofY + 42);
  context.quadraticCurveTo(x + width / 2, roofY - 28, x + width + 8, roofY + 42);
  context.lineTo(x + width - 10, roofY + 56);
  context.quadraticCurveTo(x + width / 2, roofY + 12, x + 10, roofY + 56);
  context.closePath();
  context.fill();

  context.fillStyle = '#f18372';
  context.beginPath();
  context.moveTo(x + 18, roofY + 24);
  context.quadraticCurveTo(x + width / 2, roofY - 6, x + width - 18, roofY + 24);
  context.lineTo(x + width - 28, roofY + 30);
  context.quadraticCurveTo(x + width / 2, roofY + 8, x + 28, roofY + 30);
  context.closePath();
  context.fill();

  context.fillStyle = '#f6ecd5';
  fillRoundedRect(context, x + 10, wallY, width - 20, wallHeight, 18);
  context.fillStyle = '#e6d6b3';
  fillRoundedRect(context, x + 10, wallY + wallHeight - 10, width - 20, 10, 12);

  drawWindow(context, x + 26, wallY + 20);
  drawWindow(context, x + width - 62, wallY + 20);

  const doorX = HOUSE.doorX * TILE + 10;
  const doorY = HOUSE.doorY * TILE + 6;
  context.fillStyle = '#7b5136';
  fillRoundedRect(context, doorX, doorY, TILE - 20, TILE - 8, 14);
  context.fillStyle = '#5a3925';
  fillRoundedRect(context, doorX + 6, doorY + 7, TILE - 32, TILE - 18, 10);
  context.fillStyle = '#f6cd76';
  context.beginPath();
  context.arc(doorX + TILE - 27, doorY + 21, 3, 0, Math.PI * 2);
  context.fill();
}

function drawWindow(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = '#d0b17b';
  fillRoundedRect(context, x, y, 36, 26, 10);
  const glass = context.createLinearGradient(x, y, x, y + 26);
  glass.addColorStop(0, '#c2f1ff');
  glass.addColorStop(1, '#73c4e4');
  context.fillStyle = glass;
  fillRoundedRect(context, x + 4, y + 4, 28, 18, 8);
  context.strokeStyle = 'rgba(255,255,255,0.55)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x + 18, y + 5);
  context.lineTo(x + 18, y + 21);
  context.moveTo(x + 5, y + 13);
  context.lineTo(x + 31, y + 13);
  context.stroke();
}

function drawFences(context: CanvasRenderingContext2D) {
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (MAP[y][x] !== 'fence') continue;
      const px = x * TILE;
      const py = y * TILE;

      context.fillStyle = 'rgba(45, 33, 19, 0.1)';
      context.fillRect(px + 6, py + 30, TILE - 12, 4);

      context.fillStyle = '#9b6b46';
      fillRoundedRect(context, px + 8, py + 11, 8, 24, 4);
      fillRoundedRect(context, px + 20, py + 8, 8, 28, 4);
      fillRoundedRect(context, px + 32, py + 11, 8, 24, 4);
      fillRoundedRect(context, px + 4, py + 14, TILE - 8, 7, 4);
      fillRoundedRect(context, px + 6, py + 24, TILE - 12, 6, 4);
    }
  }
}

function drawBushes(context: CanvasRenderingContext2D) {
  forEachTile('bush', (x, y) => {
    const px = x * TILE;
    const py = y * TILE;

    context.fillStyle = 'rgba(31, 76, 34, 0.18)';
    context.beginPath();
    context.ellipse(px + 24, py + 34, 16, 8, 0, 0, Math.PI * 2);
    context.fill();

    const bush = context.createLinearGradient(px, py + 10, px, py + 38);
    bush.addColorStop(0, '#7ed46e');
    bush.addColorStop(1, '#489248');
    context.fillStyle = bush;
    drawBlob(context, [
      [px + 8, py + 31, 10],
      [px + 20, py + 24, 12],
      [px + 32, py + 30, 10],
    ]);

    context.fillStyle = 'rgba(240, 255, 222, 0.3)';
    context.beginPath();
    context.arc(px + 19, py + 21, 5, 0, Math.PI * 2);
    context.arc(px + 31, py + 26, 4, 0, Math.PI * 2);
    context.fill();
  });
}

function drawFlowers(context: CanvasRenderingContext2D) {
  forEachTile('flowers', (x, y) => {
    const px = x * TILE;
    const py = y * TILE;
    const blossoms = [
      { x: 13, y: 14, color: '#fff3f5' },
      { x: 29, y: 18, color: '#ff9ec5' },
      { x: 20, y: 30, color: '#ffd76f' },
      { x: 34, y: 31, color: '#d7f281' },
    ];

    blossoms.forEach((blossom) => {
      context.fillStyle = '#4f9248';
      context.fillRect(px + blossom.x, py + blossom.y + 3, 2, 8);
      drawFlower(context, px + blossom.x + 1, py + blossom.y, blossom.color);
    });
  });
}

function drawFlower(context: CanvasRenderingContext2D, x: number, y: number, color: string) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x - 2, y, 2.4, 0, Math.PI * 2);
  context.arc(x + 2, y, 2.4, 0, Math.PI * 2);
  context.arc(x, y - 2, 2.4, 0, Math.PI * 2);
  context.arc(x, y + 2, 2.4, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ffcf6d';
  context.beginPath();
  context.arc(x, y, 1.5, 0, Math.PI * 2);
  context.fill();
}

function drawTrees(context: CanvasRenderingContext2D) {
  forEachTile('tree', (x, y) => {
    const px = x * TILE;
    const py = y * TILE;

    context.fillStyle = 'rgba(24, 57, 27, 0.22)';
    context.beginPath();
    context.ellipse(px + 24, py + 35, 15, 8, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#7a5431';
    fillRoundedRect(context, px + 19, py + 23, 10, 18, 5);

    const canopy = context.createLinearGradient(px, py + 6, px, py + 34);
    canopy.addColorStop(0, '#a0ee88');
    canopy.addColorStop(1, '#3e8c49');
    context.fillStyle = canopy;
    drawBlob(context, [
      [px + 15, py + 20, 12],
      [px + 29, py + 18, 13],
      [px + 24, py + 11, 14],
    ]);

    context.fillStyle = 'rgba(242, 255, 223, 0.38)';
    context.beginPath();
    context.arc(px + 19, py + 12, 5, 0, Math.PI * 2);
    context.arc(px + 31, py + 15, 4, 0, Math.PI * 2);
    context.fill();
  });
}

function drawPlayerShadow(context: CanvasRenderingContext2D, tileX: number, tileY: number) {
  const centerX = tileX * TILE + TILE / 2;
  const centerY = tileY * TILE + TILE - 8;

  context.fillStyle = 'rgba(23, 31, 22, 0.18)';
  context.beginPath();
  context.ellipse(centerX, centerY, 12, 7, 0, 0, Math.PI * 2);
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
  const bob = moving ? Math.sin(performance.now() / 100) * 0.8 : 0;

  context.fillStyle = '#5b77da';
  fillRoundedRect(context, px + 15, py + 28 + bob, 7, 11, 4);
  fillRoundedRect(context, px + 26, py + 28 - bob, 7, 11, 4);

  context.fillStyle = '#fff2df';
  context.beginPath();
  context.arc(px + 24, py + 18, 10, 0, Math.PI * 2);
  context.fill();

  const hair = context.createLinearGradient(px + 16, py + 10, px + 30, py + 26);
  hair.addColorStop(0, '#7f57d8');
  hair.addColorStop(1, '#50308f');
  context.fillStyle = hair;
  context.beginPath();
  context.arc(px + 24, py + 15, 11, Math.PI, 0);
  context.lineTo(px + 34, py + 18);
  context.quadraticCurveTo(px + 24, py + 6, px + 14, py + 18);
  context.closePath();
  context.fill();

  context.fillStyle = '#5b39a5';
  fillRoundedRect(context, px + 14, py + 22, 20, 11, 6);
  context.fillStyle = '#7e5be1';
  fillRoundedRect(context, px + 16, py + 23, 16, 8, 5);

  context.fillStyle = '#f0d57a';
  fillRoundedRect(context, px + 18, py + 9, 12, 4, 3);

  context.fillStyle = '#1f2028';
  if (facing === 'down') {
    drawEye(context, px + 20, py + 18);
    drawEye(context, px + 28, py + 18);
    context.fillStyle = '#f19ea4';
    fillRoundedRect(context, px + 22, py + 22, 4, 2, 2);
  } else if (facing === 'left') {
    drawEye(context, px + 19, py + 18);
  } else if (facing === 'right') {
    drawEye(context, px + 29, py + 18);
  } else {
    context.fillStyle = '#d7bd96';
    fillRoundedRect(context, px + 18, py + 21, 12, 2, 2);
  }
}

function drawEye(context: CanvasRenderingContext2D, x: number, y: number) {
  context.beginPath();
  context.arc(x, y, 1.7, 0, Math.PI * 2);
  context.fill();
}

function drawBlob(
  context: CanvasRenderingContext2D,
  circles: Array<[number, number, number]>,
) {
  context.beginPath();
  circles.forEach(([x, y, radius], index) => {
    context.moveTo(x + radius, y);
    context.arc(x, y, radius, 0, Math.PI * 2);
    if (index === circles.length - 1) {
      context.closePath();
    }
  });
  context.fill();
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  roundedRectPath(context, x, y, width, height, radius);
  context.fill();
}

function strokeRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  roundedRectPath(context, x, y, width, height, radius);
  context.stroke();
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function forEachTile(type: TileType, callback: (x: number, y: number) => void) {
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (MAP[y][x] === type) {
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

function isWater(x: number, y: number) {
  return MAP[y]?.[x] === 'water';
}

export default App;
