// Emote bubbles: a white speech bubble with an emoji in it, drawn once per
// mood into a small canvas and shown as a sprite over the cat.
import { CanvasTexture, SRGBColorSpace } from "three";

import type { Emote } from "./world";

export const EMOJI: Record<Emote, string> = {
  alert: "❗",
  yum: "😋",
  love: "😻",
  grumpy: "😾",
  hunt: "😼",
  sleep: "💤",
};

const cache = new Map<Emote, CanvasTexture>();

/** The bubble for `emote` (cached). */
export const emoteTexture = (emote: Emote) => {
  let t = cache.get(emote);
  if (t) return t;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  // A round bubble with a little tail at the bottom.
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(90, 60, 70, 0.35)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.44, size * 0.38, 0, Math.PI * 2);
  ctx.moveTo(size * 0.44, size * 0.78);
  ctx.lineTo(size / 2, size * 0.96);
  ctx.lineTo(size * 0.58, size * 0.78);
  ctx.fill();
  ctx.stroke();
  ctx.font = `${Math.round(size * 0.42)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(EMOJI[emote], size / 2, size * 0.46);
  t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  cache.set(emote, t);
  return t;
};
