import QRCode from 'qrcode';

export type DotStyle = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'blended';
export type CornerSquareStyle = 'square' | 'extra-rounded' | 'dot';
export type CornerDotStyle = 'square' | 'dot';

export interface QROptions {
  text: string;
  size: number;
  dotStyle: DotStyle;
  cornerSquareStyle: CornerSquareStyle;
  cornerDotStyle: CornerDotStyle;
  fgColor: string;
  bgColor: string;
  centerImage?: string | null;
  centerImageSize: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  gradient?: {
    type: 'linear' | 'radial';
    color1: string;
    color2: string;
  } | null;
}

async function getQRMatrix(text: string, ecl: string): Promise<boolean[][]> {
  const data = await QRCode.create(text, { errorCorrectionLevel: ecl as 'L' | 'M' | 'Q' | 'H' });
  const size = data.modules.size;
  const matrix: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    matrix[r] = [];
    for (let c = 0; c < size; c++) {
      matrix[r][c] = !!data.modules.get(r, c);
    }
  }
  return matrix;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  radius: number
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCornerSquare(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  style: CornerSquareStyle,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size / 7;
  const lw = ctx.lineWidth;

  if (style === 'extra-rounded') {
    const r = size * 0.3;
    ctx.beginPath();
    drawRoundedRect(ctx, x + lw / 2, y + lw / 2, size - lw, size - lw, r);
    ctx.stroke();
  } else if (style === 'dot') {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - lw / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeRect(x + lw / 2, y + lw / 2, size - lw, size - lw);
  }
}

function drawCornerDot(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  style: CornerDotStyle,
  color: string
) {
  ctx.fillStyle = color;
  const innerSize = size * 3 / 7;
  const cx = x + size / 2;
  const cy = y + size / 2;

  if (style === 'dot') {
    ctx.beginPath();
    ctx.arc(cx, cy, innerSize / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(cx - innerSize / 2, cy - innerSize / 2, innerSize, innerSize);
  }
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, cellSize: number,
  style: DotStyle,
  color: string,
  matrix: boolean[][],
  row: number,
  col: number
) {
  const padding = cellSize * 0.1;
  const s = cellSize - padding * 2;
  const px = x + padding;
  const py = y + padding;
  ctx.fillStyle = color;

  if (style === 'dots') {
    ctx.beginPath();
    ctx.arc(px + s / 2, py + s / 2, s / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'rounded') {
    drawRoundedRect(ctx, px, py, s, s, s * 0.3);
    ctx.fill();
  } else if (style === 'classy-rounded' || style === 'blended') {
    const top = row > 0 && matrix[row - 1]?.[col];
    const bottom = matrix[row + 1]?.[col];
    const left = matrix[row]?.[col - 1];
    const right = matrix[row]?.[col + 1];
    const r = s * 0.38;
    ctx.beginPath();
    ctx.moveTo(px + (left ? 0 : r), py);
    ctx.lineTo(px + s - (right ? 0 : r), py);
    if (!right) ctx.arcTo(px + s, py, px + s, py + r, r);
    ctx.lineTo(px + s, py + s - (bottom ? 0 : r));
    if (!bottom) ctx.arcTo(px + s, py + s, px + s - r, py + s, r);
    ctx.lineTo(px + (left ? 0 : r), py + s);
    if (!left) ctx.arcTo(px, py + s, px, py + s - r, r);
    ctx.lineTo(px, py + (top ? 0 : r));
    if (!top) ctx.arcTo(px, py, px + r, py, r);
    ctx.closePath();
    ctx.fill();
  } else {
    // square or classy
    ctx.fillRect(px, py, s, s);
  }
}

export async function renderQR(
  canvas: HTMLCanvasElement,
  options: QROptions,
  centerImg?: HTMLImageElement | null
): Promise<void> {
  const { text, size, dotStyle, cornerSquareStyle, cornerDotStyle, fgColor, bgColor, centerImageSize, gradient } = options;

  let matrix: boolean[][];
  try {
    matrix = await getQRMatrix(text || 'https://example.com', options.errorCorrectionLevel);
  } catch {
    matrix = await getQRMatrix('https://example.com', 'H');
  }

  const qrSize = matrix.length;
  const cellSize = size / qrSize;

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Clear with transparency support
  ctx.clearRect(0, 0, size, size);
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  let fillColor: string | CanvasGradient = fgColor;
  if (gradient) {
    if (gradient.type === 'linear') {
      const g = ctx.createLinearGradient(0, 0, size, size);
      g.addColorStop(0, gradient.color1);
      g.addColorStop(1, gradient.color2);
      fillColor = g;
    } else {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, gradient.color1);
      g.addColorStop(1, gradient.color2);
      fillColor = g;
    }
  }

  const finderPositions = [
    { r: 0, c: 0 },
    { r: 0, c: qrSize - 7 },
    { r: qrSize - 7, c: 0 },
  ];

  const finderCells = new Set<string>();
  for (const fp of finderPositions) {
    for (let dr = 0; dr < 7; dr++) {
      for (let dc = 0; dc < 7; dc++) {
        finderCells.add(`${fp.r + dr},${fp.c + dc}`);
      }
    }
  }

  // Draw data dots
  for (let r = 0; r < qrSize; r++) {
    for (let c = 0; c < qrSize; c++) {
      if (finderCells.has(`${r},${c}`)) continue;
      if (!matrix[r][c]) continue;

      const x = c * cellSize;
      const y = r * cellSize;

      if (typeof fillColor === 'string') {
        drawDot(ctx, x, y, cellSize, dotStyle, fillColor, matrix, r, c);
      } else {
        ctx.save();
        const padding = cellSize * 0.1;
        const s = cellSize - padding * 2;
        const px = x + padding;
        const py = y + padding;
        ctx.beginPath();
        if (dotStyle === 'dots') {
          ctx.arc(px + s / 2, py + s / 2, s / 2, 0, Math.PI * 2);
        } else if (dotStyle === 'rounded' || dotStyle === 'classy-rounded' || dotStyle === 'blended') {
          drawRoundedRect(ctx, px, py, s, s, s * 0.3);
        } else {
          ctx.rect(px, py, s, s);
        }
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // Draw finder patterns
  for (const fp of finderPositions) {
    const x = fp.c * cellSize;
    const y = fp.r * cellSize;
    const squareSize = 7 * cellSize;
    const color = typeof fillColor === 'string' ? fillColor : fgColor;

    ctx.save();
    drawCornerSquare(ctx, x, y, squareSize, cornerSquareStyle, color);
    drawCornerDot(ctx, x, y, squareSize, cornerDotStyle, color);
    ctx.restore();
  }

  // Draw center image
  if (centerImg && options.centerImage) {
    const imgSize = size * (centerImageSize / 100);
    const imgX = (size - imgSize) / 2;
    const imgY = (size - imgSize) / 2;
    const pad = imgSize * 0.06;
    ctx.fillStyle = bgColor;
    ctx.fillRect(imgX - pad, imgY - pad, imgSize + pad * 2, imgSize + pad * 2);
    ctx.drawImage(centerImg, imgX, imgY, imgSize, imgSize);
  }
}
