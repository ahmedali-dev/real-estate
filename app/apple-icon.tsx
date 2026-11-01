import { ImageResponse } from "next/og";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export default function AppleIcon() {
  return new ImageResponse(<div style={{width:"100%",height:"100%",background:"#1d9bf0",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:86,fontWeight:700}}>41</div>,size);
}
