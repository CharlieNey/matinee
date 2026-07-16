"use client";

import posterImages from "./posters.json";
import { Show } from "./shows";

/**
 * Client-side share images (Phase 11): canvas-rendered PNGs in the DESIGN.md
 * language — cream paper, espresso ink, one vermilion moment, poster art
 * doing the decorating. 1080×1350 (4:5), the format people actually post.
 */

const POSTER_SRC: Record<string, string> = posterImages;

const W = 1080;
const H = 1350;
const CREAM = "#F4F3F2";
const PAPER = "#FFFFFF";
const INK = "#200604";
const INK_SOFT = "#8A8380";
const VERMILION = "#D7492B";
const GOLD = "#F4AA1B";

const SANS =
  '-apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

function font(weight: number, size: number): string {
  return `${weight} ${size}px ${SANS}`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** First hex color in a CSS color/gradient string (poster bg gotcha). */
function firstHex(value: string, fallback: string): string {
  return value.match(/#[0-9a-fA-F]{3,8}/)?.[0] ?? fallback;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Poster tile: real art when we have it, typographic tile when we don't. */
async function drawPoster(
  ctx: CanvasRenderingContext2D,
  show: Show,
  x: number,
  y: number,
  size: number,
) {
  const src = POSTER_SRC[show.slug];
  const img = src ? await loadImage(src) : null;

  ctx.save();
  roundRectPath(ctx, x, y, size, size, size * 0.07);
  ctx.clip();
  if (img) {
    // Cover-fit the square tile.
    const scale = Math.max(size / img.width, size / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = firstHex(show.poster.bg, "#220C06");
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = show.poster.fg;
    ctx.font = font(800, size * 0.11);
    ctx.textAlign = "center";
    const title = show.poster.displayTitle ?? show.title;
    wrapText(ctx, title, x + size / 2, y + size / 2 - size * 0.05, size * 0.8, size * 0.13, 3);
  }
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = probe;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, centerX, startY + i * lineHeight));
  return lines.length;
}

/** Brand footer: the ticket mark + wordmark, quiet. */
function drawBrand(ctx: CanvasRenderingContext2D, y: number) {
  ctx.textAlign = "center";
  // Ticket glyph
  const tx = W / 2 - 86;
  ctx.fillStyle = VERMILION;
  roundRectPath(ctx, tx, y - 26, 64, 42, 10);
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(tx, y - 5, 9, 0, Math.PI * 2);
  ctx.arc(tx + 64, y - 5, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = font(800, 44);
  ctx.textAlign = "left";
  ctx.fillText("Theatr", tx + 84, y + 10);
}

function cardBase(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PAPER;
  roundRectPath(ctx, 48, 48, W - 96, H - 96, 56);
  ctx.fill();
}

async function renderToBlob(
  draw: (ctx: CanvasRenderingContext2D) => Promise<void>,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  await draw(ctx);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    ),
  );
}

const shareDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function renderWinCard(options: {
  show: Show;
  kindLabel: string;
  price: number;
  date: Date;
}): Promise<Blob> {
  const { show, kindLabel, price, date } = options;
  return renderToBlob(async (ctx) => {
    cardBase(ctx);
    await drawPoster(ctx, show, W / 2 - 250, 128, 500);

    ctx.textAlign = "center";
    ctx.fillStyle = GOLD;
    ctx.font = font(700, 40);
    ctx.fillText(`🎉  Won the ${kindLabel.toLowerCase()}`, W / 2, 730);

    ctx.fillStyle = INK;
    ctx.font = font(800, 64);
    wrapText(ctx, show.title, W / 2, 812, W - 240, 74, 2);

    ctx.font = font(800, 88);
    ctx.fillText(`$${price}`, W / 2, 1010);
    ctx.fillStyle = INK_SOFT;
    ctx.font = font(400, 40);
    ctx.fillText(`face value $${show.faceValue}`, W / 2, 1068);

    ctx.font = font(400, 34);
    ctx.fillText(shareDate.format(date), W / 2, 1140);

    drawBrand(ctx, 1240);
  });
}

export function renderStubCard(options: {
  show: Show;
  sentimentLine: string;
  thoughts: string | null;
  date: Date;
}): Promise<Blob> {
  const { show, sentimentLine, thoughts, date } = options;
  return renderToBlob(async (ctx) => {
    cardBase(ctx);
    await drawPoster(ctx, show, W / 2 - 250, 128, 500);

    ctx.textAlign = "center";
    ctx.fillStyle = INK;
    ctx.font = font(800, 64);
    const titleLines = wrapText(ctx, show.title, W / 2, 730, W - 240, 74, 2);

    const afterTitle = 730 + titleLines * 74;
    ctx.fillStyle = GOLD;
    ctx.font = font(700, 40);
    ctx.fillText(sentimentLine, W / 2, afterTitle + 24);

    if (thoughts) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = `italic 400 40px ${SANS}`;
      wrapText(ctx, `“${thoughts}”`, W / 2, afterTitle + 110, W - 280, 54, 3);
    }

    ctx.fillStyle = INK_SOFT;
    ctx.font = font(400, 34);
    ctx.fillText(shareDate.format(date), W / 2, 1140);

    drawBrand(ctx, 1240);
  });
}

export function renderWrappedCard(options: {
  stats: { label: string; value: string }[];
  shows: Show[];
  season: string;
}): Promise<Blob> {
  const { stats, shows, season } = options;
  return renderToBlob(async (ctx) => {
    cardBase(ctx);

    ctx.textAlign = "center";
    ctx.fillStyle = INK_SOFT;
    ctx.font = font(600, 36);
    ctx.fillText(season.toUpperCase(), W / 2, 150);
    ctx.fillStyle = INK;
    ctx.font = font(800, 76);
    ctx.fillText("A season at the theater", W / 2, 236);

    // Poster shelf (up to 5)
    const tiles = shows.slice(0, 5);
    const size = 168;
    const gap = 20;
    const total = tiles.length * size + (tiles.length - 1) * gap;
    let x = (W - total) / 2;
    for (const show of tiles) {
      await drawPoster(ctx, show, x, 300, size);
      x += size + gap;
    }

    // Stat rows
    let y = 590;
    for (const stat of stats) {
      ctx.textAlign = "left";
      ctx.fillStyle = INK_SOFT;
      ctx.font = font(400, 40);
      ctx.fillText(stat.label, 150, y);
      ctx.textAlign = "right";
      ctx.fillStyle = INK;
      ctx.font = font(800, 52);
      ctx.fillText(stat.value, W - 150, y);
      ctx.strokeStyle = "#E7E4E3";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(150, y + 36);
      ctx.lineTo(W - 150, y + 36);
      ctx.stroke();
      y += 108;
    }

    drawBrand(ctx, 1240);
  });
}

/** Share via the Web Share API when possible, otherwise download. */
export async function shareImage(
  blob: Blob,
  filename: string,
  title: string,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch {
      // Cancelled or unsupported mid-flight — fall through to download.
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
