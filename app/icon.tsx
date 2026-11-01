import { ImageResponse } from "next/og";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";
export default function Icon() {
  return new ImageResponse(<div style={{width:"100%",height:"100%",background:"#1d9bf0",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:220,fontWeight:700}}>41</div>,size);
}
