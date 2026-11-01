import { createElement } from "react";
import { ImageResponse } from "next/og";
export const dynamic = "force-static";
export function GET() {
  return new ImageResponse(createElement("div", { style: { width:"100%", height:"100%", background:"#1d9bf0", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:90, fontWeight:700 } }, "41"), { width:192, height:192 });
}
