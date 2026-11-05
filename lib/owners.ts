import type { PipelineStage } from "mongoose";
import { literalSearch } from "./search";
export function ownerOptionsPipeline(buildOnly:boolean,search:string,page:number):PipelineStage[]{
 const match:Record<string,unknown>={"owner.name":{$type:"string",$ne:""},"owner.phone":{$type:"string",$ne:""},...(buildOnly?{category:"build"}:{})};
 const term=literalSearch(search);if(term)match.$or=[{"owner.name":{$regex:term,$options:"i"}},{"owner.phone":{$regex:term,$options:"i"}}];
 return [{$match:match},{$sort:{updatedAt:-1,_id:-1}},{$group:{_id:{name:{$toLower:{$trim:{input:"$owner.name"}}},phone:{$reduce:{input:[" ","-","(",")","+"],initialValue:{$trim:{input:"$owner.phone"}},in:{$replaceAll:{input:"$$value",find:"$$this",replacement:""}}}}},source:{$first:"$_id"},owner:{$first:"$owner"}}},{$sort:{"owner.name":1,source:1}},{$skip:(page-1)*25},{$limit:26},{$project:{_id:0,id:{$toString:"$source"},name:"$owner.name",phone:"$owner.phone",email:{$ifNull:["$owner.email",""]},notes:{$ifNull:["$owner.notes",""]}}}];
}
export interface SavedOwnerOption {id:string;name:string;phone:string;email:string;notes:string}
