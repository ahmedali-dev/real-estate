import { NextRequest,NextResponse } from "next/server";
import { requireListingsAccess } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { validId,propertyScope } from "@/lib/management/server";
import { attachmentMime,maxAttachmentBytes,safeAttachmentName } from "@/lib/management/attachments";
import { Property } from "@/models/Property";
import { ManagementRecord } from "@/models/ManagementRecord";
import { ManagementAttachment } from "@/models/ManagementAttachment";

export async function GET(req:NextRequest){
  const {session,response}=await requireListingsAccess();if(response)return response;
  const id=req.nextUrl.searchParams.get("id")||"";
  if(!validId(id))return NextResponse.json({error:"Invalid file."},{status:400});
  try{
    await connectToDatabase();
    const file=await ManagementAttachment.findById(id).select("+bytes");
    const record=file?await ManagementRecord.findOne({_id:file.recordId,"attachments.id":id}).select("propertyId"):null;
    if(!file||!record||!await Property.exists(propertyScope(record.propertyId.toString(),session!.user.role)))return NextResponse.json({error:"File not found."},{status:404});
    return new NextResponse(new Uint8Array(file.bytes),{headers:{"Content-Type":file.mime,"Content-Disposition":`attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g,c=>"%"+c.charCodeAt(0).toString(16))}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"}});
  }catch{return NextResponse.json({error:"Unable to download file."},{status:500});}
}
export async function POST(req:NextRequest){
  const {session,response}=await requireListingsAccess();if(response)return response;
  if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Forbidden"},{status:403});
  try{
    // Bound the actual streamed body, including requests without Content-Length.
    const reader=req.body?.getReader();if(!reader)return NextResponse.json({error:"No file."},{status:400});
    const chunks:Uint8Array[]=[];let length=0;
    for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maxAttachmentBytes+65536){await reader.cancel();return NextResponse.json({error:"File exceeds 3 MB."},{status:413});}chunks.push(value);}
    const body=await new Response(Buffer.concat(chunks),{headers:{"Content-Type":req.headers.get("content-type")||""}}).formData();
    const id=String(body.get("recordId")||""),version=Number(body.get("version")),file=body.get("file");
    if(!validId(id)||!Number.isInteger(version)||version<0||!(file instanceof File)||file.size===0||file.size>maxAttachmentBytes)return NextResponse.json({error:"Invalid file. Maximum 3 MB."},{status:400});
    const bytes=Buffer.from(await file.arrayBuffer()),mime=attachmentMime(bytes);
    if(!mime||mime!==file.type)return NextResponse.json({error:"Upload a PDF, JPG, PNG or WebP file."},{status:400});
    await connectToDatabase();
    const record=await ManagementRecord.findOne({_id:id,version,archived:false});
    if(!record)return NextResponse.json({error:"Record changed. Reload before uploading."},{status:409});
    if(record.attachments.length>=10)return NextResponse.json({error:"Maximum 10 attachments per record."},{status:400});
    if(!await Property.exists(propertyScope(record.propertyId.toString(),session!.user.role)))return NextResponse.json({error:"Record not found."},{status:404});
    const stored=await ManagementAttachment.create({recordId:record._id,name:safeAttachmentName(file.name),mime,size:bytes.length,bytes});
    const meta={id:stored._id.toString(),name:stored.name,mime,size:stored.size};
    try{
      const updated=await ManagementRecord.findOneAndUpdate({_id:id,version,archived:false},{$push:{attachments:meta,audit:{action:"attachment_added",at:new Date(),actorId:session!.user.id,actorName:session!.user.name||"Staff",after:meta}},$inc:{version:1}},{new:true,runValidators:true});
      if(!updated){await ManagementAttachment.deleteOne({_id:stored._id});return NextResponse.json({error:"Record changed. Reload before uploading."},{status:409});}
      return NextResponse.json({data:updated},{status:201});
    }catch(error){await ManagementAttachment.deleteOne({_id:stored._id});throw error;}
  }catch{return NextResponse.json({error:"Unable to upload document."},{status:500});}
}
