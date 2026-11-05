import { NextRequest,NextResponse } from "next/server";
import { requireListingsAccess,isBuildOnlyRole } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { ownerOptionsPipeline,type SavedOwnerOption } from "@/lib/owners";
import { Property } from "@/models/Property";
export async function GET(req:NextRequest){
 const {session,response}=await requireListingsAccess();if(response)return response;
 const raw=Number(req.nextUrl.searchParams.get("page")||1),page=Number.isFinite(raw)?Math.min(10000,Math.max(1,Math.floor(raw))):1;
 try{
  await connectToDatabase();const owners=await Property.aggregate<SavedOwnerOption>(ownerOptionsPipeline(isBuildOnlyRole(session!.user.role),req.nextUrl.searchParams.get("search")||"",page));
  return NextResponse.json({data:owners.slice(0,25),hasMore:owners.length>25,page},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Unable to load saved owners."},{status:500});}
}
