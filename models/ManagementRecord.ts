import mongoose, { Schema } from "mongoose";
import type { RecordKind } from "@/lib/management/records";
interface RecordDocument {
  requestKey?:string;requestHash?:string;
  propertyId:mongoose.Types.ObjectId;kind:RecordKind;data:Record<string,unknown>;version:number;archived:boolean;
  attachments:{id:string;name:string;size:number;mime:string}[];
  audit:{action:string;at:Date;actorId:string;actorName:string;before?:Record<string,unknown>;after?:Record<string,unknown>;reason?:string}[];
  createdAt:Date;updatedAt:Date;
}
const schema = new Schema<RecordDocument>({
  requestKey:{type:String,unique:true,sparse:true,select:false},requestHash:{type:String,select:false},
  propertyId:{type:Schema.Types.ObjectId,ref:"Property",required:true,index:true},
  kind:{type:String,enum:["agreement","lease","income","expense"],required:true},
  data:{type:Schema.Types.Mixed,required:true},version:{type:Number,default:0},archived:{type:Boolean,default:false},
  attachments:{type:[{_id:false,id:String,name:String,size:Number,mime:String}],default:[]},
  audit:{type:[{_id:false,action:String,at:Date,actorId:String,actorName:String,before:Schema.Types.Mixed,after:Schema.Types.Mixed,reason:String}],default:[]},
},{timestamps:true});
schema.index({propertyId:1,kind:1,archived:1,createdAt:-1});
if(mongoose.models.ManagementRecord&&!mongoose.models.ManagementRecord.schema.path("requestKey"))mongoose.deleteModel("ManagementRecord");
export const ManagementRecord = (mongoose.models.ManagementRecord as mongoose.Model<RecordDocument>) || mongoose.model<RecordDocument>("ManagementRecord",schema);
