export const maxAttachmentBytes=3*1024*1024;
export function attachmentMime(bytes:Uint8Array):string|null{
  if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return "image/jpeg";
  if([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return "image/png";
  const ascii=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
  if(ascii(0,5)==="%PDF-")return "application/pdf";
  if(ascii(0,4)==="RIFF"&&ascii(8,12)==="WEBP")return "image/webp";
  return null;
}
export function safeAttachmentName(name:string){return name.replace(/[\x00-\x1f\x7f/\\"]/g,"_").slice(0,160)||"attachment";}
