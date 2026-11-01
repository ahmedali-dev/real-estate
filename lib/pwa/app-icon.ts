import { readFile } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import { ImageResponse } from "next/og";

/** Render the existing brand artwork at each platform's required icon size. */
export async function renderAppIcon(size: number) {
  const logo = await readFile(path.join(process.cwd(), "public/brand/logo.png"));
  return new ImageResponse(createElement("div", {
    style: { width:"100%", height:"100%", background:"#ffffff", display:"flex", position:"relative", overflow:"hidden" },
  }, createElement("img", {
    src: `data:image/png;base64,${logo.toString("base64")}`,
    width: Math.round(size * 1.5), height: Math.round(size * 1.5 * 472 / 529),
    style: { position:"absolute", left: -size * .25, top: -size * .21 },
  })), { width:size, height:size });
}
