import { useEffect, useRef, useState } from 'react';

const MAP_SRC = '/pokemonlike-fantasy/assets/generated/restart/map.png';
const IDLE_SRC = '/pokemonlike-fantasy/assets/generated/restart/player-idle.png';
const WALK_SRC = '/pokemonlike-fantasy/assets/generated/restart/player-walk.png';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;
const PLAYER_SCALE = 0.28;
const STEP_MS = 220;

type Direction = 'up' | 'down' | 'left' | 'right';
type MoveIntent = { dx: number; dy: number; facing: Direction };
type Rect = { x: number; y: number; width: number; height: number };
type FrameMap = Record<Direction, Rect[]>;
type LoadedAssets = {
  map: HTMLImageElement;
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

const COLLIDERS: Rect[] = [
  { x: 4, y: 44, width: 193, height: 165 },
  { x: 650, y: 30, width: 220, height: 162 },
  { x: 285, y: 40, width: 120, height: 92 },
  { x: 720, y: 435, width: 120, height: 92 },
  { x: 0, y: 0, width: CANVAS_WIDTH, height: 20 },
  { x: 0, y: CANVAS_HEIGHT - 26, width: CANVAS_WIDTH, height: 26 },
];

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetsRef = useRef<LoadedAssets | null>(null);
  const heldDirectionRef = useRef<Direction | null>(null);
  const bufferedDirectionRef = useRef<Direction | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerState>({
    x: 450,
    y: 360,
    startX: 450,
    startY: 360,
    targetX: 450,
    targetY: 360,
    moving: false,
    moveStartedAt: 0,
    facing: 'down',
  });

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
      const input = INPUTS[event.key.toLowerCase()];
      if (!input) return;

      event.preventDefault();
      heldDirectionRef.current = input.facing;
      bufferedDirectionRef.current = input.facing;

      setPlayer((current) => {
        if (current.moving) {
          return current.facing === input.facing ? current : { ...current, facing: input.facing };
        }

        return attemptMove(current, input, performance.now());
      });
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
      setPlayer((current) => {
        if (!current.moving) {
          const nextDirection = bufferedDirectionRef.current ?? heldDirectionRef.current;
          if (!nextDirection) return current;
          const nextMove = directionToMove(nextDirection);
          return nextMove ? attemptMove(current, nextMove, timestamp) : current;
        }

        const progress = Math.min((timestamp - current.moveStartedAt) / STEP_MS, 1);
        if (progress < 1) {
          return {
            ...current,
            x: lerp(current.startX, current.targetX, progress),
            y: lerp(current.startY, current.targetY, progress),
          };
        }

        const settled = {
          ...current,
          x: current.targetX,
          y: current.targetY,
          startX: current.targetX,
          startY: current.targetY,
          moving: false,
        };

        const nextDirection = bufferedDirectionRef.current ?? heldDirectionRef.current;
        if (!nextDirection) return settled;
        const nextMove = directionToMove(nextDirection);
        return nextMove ? attemptMove(settled, nextMove, timestamp) : settled;
      });

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

    renderScene(context, assets, player);
  }, [loadError, player, ready]);

  return (
    <main className="app-shell">
      <section className="intro-card">
        <p className="eyebrow">Restart propre</p>
        <h1>Nouvelle map, nouveau perso, base saine</h1>
        <p className="description">
          On a jeté l’ancien bazar. Cette fois la map et les sprites viennent de nouvelles passes IA,
          avec poses d’arrêt et cycle de marche séparés.
        </p>
        <div className="tips">
          <span>Déplacement: flèches, ZQSD ou WASD</span>
          <span>Sprites idle + walk recâblés depuis zéro</span>
          <span>Base minimaliste pour repartir sans dette visuelle</span>
        </div>
      </section>

      <section className="game-frame">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          aria-label="Première map fantasy"
        />
      </section>
    </main>
  );
}

async function buildAssets(): Promise<LoadedAssets> {
  const [map, idle, walk] = await Promise.all([loadImage(MAP_SRC), loadImage(IDLE_SRC), loadImage(WALK_SRC)]);
  const idleSheet = removeGreenScreen(idle);
  const walkSheet = removeGreenScreen(walk);

  return {
    map,
    idleSheet,
    walkSheet,
    idleFrames: detectIdleFrames(idleSheet),
    walkFrames: detectWalkFrames(walkSheet),
  };
}

function renderScene(context: CanvasRenderingContext2D, assets: LoadedAssets, player: PlayerState) {
  context.imageSmoothingEnabled = true;
  context.drawImage(assets.map, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawPlayerShadow(context, player.x, player.y);
  drawPlayer(context, assets, player);
}

function drawPlayer(context: CanvasRenderingContext2D, assets: LoadedAssets, player: PlayerState) {
  const sourceFrames = player.moving ? assets.walkFrames[player.facing] : assets.idleFrames[player.facing];
  const frameIndex = player.moving ? Math.floor(performance.now() / 120) % sourceFrames.length : 0;
  const frame = sourceFrames[frameIndex];
  const image = player.moving ? assets.walkSheet : assets.idleSheet;

  const drawWidth = Math.round(frame.width * PLAYER_SCALE);
  const drawHeight = Math.round(frame.height * PLAYER_SCALE);
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

function attemptMove(player: PlayerState, move: MoveIntent, timestamp: number): PlayerState {
  const step = 34;
  const nextX = clamp(player.x + move.dx * step, 42, CANVAS_WIDTH - 42);
  const nextY = clamp(player.y + move.dy * step, 58, CANVAS_HEIGHT - 20);
  const body = {
    x: nextX - 12,
    y: nextY - 28,
    width: 24,
    height: 26,
  };

  if (COLLIDERS.some((collider) => intersects(body, collider))) {
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
        const current = stack.pop()!;
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

export default App;
