import { useEffect, useMemo, useRef, useState } from 'react';

const TILE = 48;
const MAP_WIDTH = 16;
const MAP_HEIGHT = 12;

type Direction = 'up' | 'down' | 'left' | 'right';
type TileType = 'grass' | 'path' | 'fence' | 'flowers' | 'water' | 'houseWall' | 'houseRoof' | 'door';

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

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [player, setPlayer] = useState({ x: 7, y: 7, facing: 'down' as Direction });

  const canvasSize = useMemo(
    () => ({ width: MAP_WIDTH * TILE, height: MAP_HEIGHT * TILE }),
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const movement: Record<string, { dx: number; dy: number; facing: Direction }> = {
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

      const nextMove = movement[key];
      if (!nextMove) return;

      event.preventDefault();

      setPlayer((current) => {
        const nextX = current.x + nextMove.dx;
        const nextY = current.y + nextMove.dy;
        const nextTile = MAP[nextY]?.[nextX];

        if (
          nextX < 0 ||
          nextY < 0 ||
          nextX >= MAP_WIDTH ||
          nextY >= MAP_HEIGHT ||
          !nextTile ||
          BLOCKING_TILES.has(nextTile)
        ) {
          return { ...current, facing: nextMove.facing };
        }

        return { x: nextX, y: nextY, facing: nextMove.facing };
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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

    drawShadow(context, player.x, player.y);
    drawPlayer(context, player.x, player.y, player.facing);
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
          <span>Direction: le perso pivote même si tu bloques contre un mur</span>
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
