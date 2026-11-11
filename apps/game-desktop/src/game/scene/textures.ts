import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { BRAND } from '../../app/brand';

/** Logo files in public/brand. */
export const LOGO_URLS = {
  captain: '/brand/captain-wordmark.png',
  dhika: '/brand/dhika.webp',
} as const;

function canvas(width: number, height: number) {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return { el, ctx };
}

function toTexture(el: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Deterministic pseudo-random numbers so the floor looks the same on every load. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Maple court boards: planks along the court length with a little tone variation. */
export function woodTexture(): CanvasTexture {
  const { el, ctx } = canvas(1024, 1024);
  const rand = seeded(7);
  const plankWidth = 32;
  for (let x = 0; x < 1024; x += plankWidth) {
    let y = -Math.floor(rand() * 400);
    while (y < 1024) {
      const length = 300 + rand() * 500;
      const tone = 0.86 + rand() * 0.2;
      ctx.fillStyle = `rgb(${Math.round(196 * tone)}, ${Math.round(138 * tone)}, ${Math.round(84 * tone)})`;
      ctx.fillRect(x, y, plankWidth, length);
      // Grain
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#5a3416';
      for (let g = 0; g < 6; g++) {
        ctx.fillRect(x + rand() * plankWidth, y, 1, length);
      }
      ctx.globalAlpha = 1;
      // Seam at the plank end
      ctx.fillStyle = 'rgba(60, 32, 12, 0.55)';
      ctx.fillRect(x, y + length - 2, plankWidth, 2);
      y += length;
    }
    ctx.fillStyle = 'rgba(60, 32, 12, 0.6)';
    ctx.fillRect(x, 0, 2, 1024);
  }
  const texture = toTexture(el);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

/** A dark-on-light logo turned into a white silhouette on transparency. */
function whiteSilhouette(image: HTMLImageElement): HTMLCanvasElement {
  const { el, ctx } = canvas(image.naturalWidth, image.naturalHeight);
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, el.width, el.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const luminance = 0.299 * (px[i] ?? 0) + 0.587 * (px[i + 1] ?? 0) + 0.114 * (px[i + 2] ?? 0);
    const alpha = ((px[i + 3] ?? 0) / 255) * (255 - luminance);
    px[i] = 255;
    px[i + 1] = 255;
    px[i + 2] = 255;
    px[i + 3] = alpha;
  }
  ctx.putImageData(data, 0, 0);
  return el;
}

/** Draws `image` centred in the box, scaled to fit with the given padding. */
function drawContained(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  box: { x: number; y: number; w: number; h: number },
  padding: number,
) {
  const w = box.w - padding * 2;
  const h = box.h - padding * 2;
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
}

/**
 * Courtside LED board strip: CAPTAIN and DHIKA logos alternating on a dark blue band,
 * plus a short call to action. `segments` panels across the texture.
 */
export function ledBoardTexture(
  captain: HTMLImageElement,
  dhika: HTMLImageElement,
  segments: number,
): CanvasTexture {
  const segmentWidth = 512;
  const height = 96;
  const { el, ctx } = canvas(segmentWidth * segments, height);
  const dhikaWhite = whiteSilhouette(dhika);

  for (let i = 0; i < segments; i++) {
    const x = i * segmentWidth;
    const gradient = ctx.createLinearGradient(x, 0, x, height);
    gradient.addColorStop(0, '#0d2a5c');
    gradient.addColorStop(1, '#071631');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, 0, segmentWidth, height);
    const box = { x, y: 0, w: segmentWidth, h: height };
    const kind = i % 3;
    if (kind === 0) {
      drawContained(ctx, captain, box, 22);
    } else if (kind === 1) {
      drawContained(ctx, dhikaWhite, box, 6);
    } else {
      ctx.fillStyle = BRAND.light;
      ctx.font = '900 italic 40px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SCAN · SWIPE · SCORE', x + segmentWidth / 2, height / 2 + 2);
    }
    // Panel divider
    ctx.fillStyle = BRAND.blue;
    ctx.fillRect(x, 0, 3, height);
  }
  // LED pixel grid
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, el.width, 1);

  return toTexture(el);
}

/** Sponsor banner above the crowd: "OFFICIAL SPONSOR" + DHIKA logo. */
export function sponsorBannerTexture(dhika: HTMLImageElement): CanvasTexture {
  const { el, ctx } = canvas(1024, 256);
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, el.width, el.height);
  ctx.strokeStyle = BRAND.blue;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, el.width - 8, el.height - 8);
  ctx.fillStyle = '#9fb3cc';
  ctx.font = '800 34px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OFFICIAL SPONSOR', 300, 128);
  drawContained(ctx, whiteSilhouette(dhika), { x: 520, y: 0, w: 460, h: 256 }, 18);
  return toTexture(el);
}
