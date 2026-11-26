// Draws the team's achievement (and the judge appreciation card) as a 1080×1920 PNG (story format) with Canvas 2D: no dependencies.
// Colours are read from the CSS tokens at runtime, so the image follows the current light/dark theme.

export interface ShareCardInput {
  rank: number | null;
  total: number;
  teamName: string;
  institution: string | null;
  scoreText: string;
  stageText: string;
  stamp: string | null;
  accent: "gold" | "silver" | "bronze" | "mint" | null;
  eventName: string;
  eventTrack: string;
  logoSrc: string;
}

const W = 1080;
const H = 1920;

function token(name: string, fallbackVar?: string): string {
  const styles = getComputedStyle(document.documentElement);
  const value = styles.getPropertyValue(name).trim();
  return value || (fallbackVar ? styles.getPropertyValue(fallbackVar).trim() : "") || "black";
}

function fontFamily(name: string): string {
  return getComputedStyle(document.body).getPropertyValue(name).trim() || "sans-serif";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo"));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Word-wraps centred text; returns the y after the last line. Long single words are hard-broken. */
function wrapCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    while (ctx.measureText(line).width > maxWidth && line.length > 1) {
      let cut = line.length - 1;
      while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut--;
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) shown[maxLines - 1] = `${shown[maxLines - 1].replace(/.{1}$/, "")}…`;
  shown.forEach((l, i) => {
    ctx.fillText(l, W / 2, y + i * lineHeight);
  });
  return y + shown.length * lineHeight;
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing is not in every browser yet; it is purely cosmetic.
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

interface CardCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ink: string;
  fg: string;
  fgMuted: string;
  from: string;
  mint: string;
  display: string;
  mono: string;
}

/** Canvas with the Guardian hero background (gradient + dotted grain), shared by every card. */
async function startCard(): Promise<CardCanvas> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  const ink = token("--ink");
  const from = token("--hero-from");
  const to = token("--hero-to");

  // Background: Guardian hero mesh + dotted grain.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, from);
  bg.addColorStop(1, to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.07;
  for (let y = 18; y < H; y += 36) {
    for (let x = 18; x < W; x += 36) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  return {
    canvas,
    ctx,
    ink,
    fg: token("--hero-fg"),
    fgMuted: token("--hero-fg-muted"),
    from,
    mint: token("--safe"),
    display: fontFamily("--font-display"),
    mono: fontFamily("--font-mono"),
  };
}

/** Ink frame + logo on top of the background; leaves text centred on the alphabetic baseline. */
async function drawFrameAndLogo({ ctx, ink }: CardCanvas, logoSrc: string) {
  // Frame.
  ctx.lineWidth = 10;
  ctx.strokeStyle = ink;
  roundRect(ctx, 40, 40, W - 96, H - 96, 56);
  ctx.stroke();

  // Logo (already a hex with transparent padding).
  try {
    const logo = await loadImage(logoSrc);
    ctx.drawImage(logo, W / 2 - 150, 90, 300, 300);
  } catch {
    // The card still works without the logo.
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/png");
  });
}

export async function createShareImage(input: ShareCardInput): Promise<Blob> {
  const card = await startCard();
  const { canvas, ctx, ink, fg, fgMuted, from, mint, display, mono } = card;
  const accentColor = input.accent === "mint" || !input.accent ? mint : token(`--medal-${input.accent}`);
  const accentSoft =
    input.accent && input.accent !== "mint" ? token(`--medal-${input.accent}-soft`) : token("--hero-from");

  // Medal glow (+ sunburst for #1) behind the rank.
  if (input.accent) {
    const cx = W / 2;
    const cy = 720;
    if (input.accent === "gold") {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 24; i++) {
        ctx.rotate((Math.PI * 2) / 24);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(1100, -60);
        ctx.lineTo(1100, 60);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 520);
    glow.addColorStop(0, accentColor);
    glow.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  await drawFrameAndLogo(card, input.logoSrc);

  // Eyebrow.
  ctx.fillStyle = ink;
  ctx.font = `700 34px ${mono}`;
  setSpacing(ctx, 6);
  ctx.fillText("PERINGKAT AKHIR", W / 2, 460);
  setSpacing(ctx, 0);

  // Rank with a medal hard shadow.
  const rankText = input.rank === null ? "Finalis" : `#${input.rank}`;
  ctx.font = `800 ${input.rank === null ? 190 : 300}px ${display}`;
  ctx.fillStyle = accentColor;
  ctx.fillText(rankText, W / 2 + 14, 790 + 14);
  ctx.fillStyle = fg;
  ctx.fillText(rankText, W / 2, 790);

  ctx.font = `600 60px ${display}`;
  ctx.fillStyle = fgMuted;
  ctx.fillText(`dari ${input.total} tim`, W / 2, 880);

  // Stamp.
  let y = 960;
  if (input.stamp) {
    ctx.save();
    ctx.translate(W / 2, 1000);
    ctx.rotate((-6 * Math.PI) / 180);
    ctx.font = `800 54px ${mono}`;
    setSpacing(ctx, 10);
    const text = input.stamp.toUpperCase();
    const width = ctx.measureText(text).width + 90;
    ctx.fillStyle = ink;
    roundRect(ctx, -width / 2 + 8, -52 + 8, width, 104, 18);
    ctx.fill();
    ctx.fillStyle = accentSoft;
    roundRect(ctx, -width / 2, -52, width, 104, 18);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = accentColor;
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 4);
    ctx.restore();
    setSpacing(ctx, 0);
    ctx.textBaseline = "alphabetic";
    y = 1160;
  }

  // Team name + institution.
  ctx.fillStyle = fg;
  ctx.font = `800 76px ${display}`;
  y = wrapCentered(ctx, input.teamName, y + 40, 880, 88, 3);
  if (input.institution) {
    ctx.fillStyle = fgMuted;
    ctx.font = `500 42px ${display}`;
    y = wrapCentered(ctx, input.institution, y + 10, 880, 52, 2);
  }

  // Score panel.
  const panelW = 620;
  const panelH = 240;
  const panelX = (W - panelW) / 2;
  const panelY = Math.max(y + 50, 1420);
  ctx.fillStyle = ink;
  roundRect(ctx, panelX + 12, panelY + 12, panelW, panelH, 36);
  ctx.fill();
  ctx.fillStyle = from;
  roundRect(ctx, panelX, panelY, panelW, panelH, 36);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `700 32px ${mono}`;
  setSpacing(ctx, 6);
  ctx.fillText(`NILAI · ${input.stageText.toUpperCase()}`, W / 2, panelY + 70);
  setSpacing(ctx, 0);
  ctx.font = `800 120px ${display}`;
  ctx.fillText(input.scoreText, W / 2, panelY + 196);

  // Footer.
  ctx.fillStyle = fgMuted;
  ctx.font = `700 34px ${mono}`;
  setSpacing(ctx, 4);
  ctx.fillText(`${input.eventName} · ${input.eventTrack}`.toUpperCase(), W / 2, H - 110);
  setSpacing(ctx, 0);

  return toPng(canvas);
}

export interface JudgeCardInput {
  judgeName: string;
  stageText: string;
  teamsJudged: number;
  eventName: string;
  eventTrack: string;
  logoSrc: string;
}

/** Judge appreciation card, same backdrop as the team card. Only the judge's own name and count. */
export async function createJudgeCardImage(input: JudgeCardInput): Promise<Blob> {
  const card = await startCard();
  const { canvas, ctx, ink, fg, fgMuted, from, mint, display, mono } = card;

  const glow = ctx.createRadialGradient(W / 2, 720, 0, W / 2, 720, 520);
  glow.addColorStop(0, mint);
  glow.addColorStop(1, "transparent");
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  await drawFrameAndLogo(card, input.logoSrc);

  ctx.fillStyle = ink;
  ctx.font = `700 34px ${mono}`;
  setSpacing(ctx, 6);
  ctx.fillText("APRESIASI DEWAN JURI", W / 2, 460);
  setSpacing(ctx, 0);

  ctx.font = `800 150px ${display}`;
  ctx.fillStyle = mint;
  ctx.fillText("Terima", W / 2 + 12, 650 + 12);
  ctx.fillText("kasih", W / 2 + 12, 800 + 12);
  ctx.fillStyle = fg;
  ctx.fillText("Terima", W / 2, 650);
  ctx.fillText("kasih", W / 2, 800);

  ctx.font = `800 76px ${display}`;
  let y = wrapCentered(ctx, input.judgeName, 960, 880, 88, 3);
  ctx.fillStyle = fgMuted;
  ctx.font = `500 42px ${display}`;
  y = wrapCentered(ctx, "atas dedikasi, waktu, dan penilaian yang objektif.", y + 20, 820, 54, 3);

  const panelW = 620;
  const panelH = 240;
  const panelX = (W - panelW) / 2;
  const panelY = Math.max(y + 60, 1420);
  ctx.fillStyle = ink;
  roundRect(ctx, panelX + 12, panelY + 12, panelW, panelH, 36);
  ctx.fill();
  ctx.fillStyle = from;
  roundRect(ctx, panelX, panelY, panelW, panelH, 36);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `700 32px ${mono}`;
  setSpacing(ctx, 6);
  ctx.fillText(`TIM DINILAI · ${input.stageText.toUpperCase()}`, W / 2, panelY + 70);
  setSpacing(ctx, 0);
  ctx.font = `800 120px ${display}`;
  ctx.fillText(String(input.teamsJudged), W / 2, panelY + 196);

  ctx.fillStyle = fgMuted;
  ctx.font = `700 34px ${mono}`;
  setSpacing(ctx, 4);
  ctx.fillText(`${input.eventName} · ${input.eventTrack}`.toUpperCase(), W / 2, H - 110);
  setSpacing(ctx, 0);

  return toPng(canvas);
}

/** Opens the native share sheet with the PNG when supported, otherwise downloads it. */
export async function shareOrDownload(blob: Blob, fileName: string, title: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], fileName, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "shared";
      // Fall through to download (e.g. share sheet unavailable for this file).
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
