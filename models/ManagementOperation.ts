import mongoose,{Schema} from "mongoose";
import type { Operation } from "@/lib/management/operations";
type Document=Omit<Operation,"_id"|"propertyId"|"audit">&{propertyId:mongoose.Types.ObjectId;requestKey?:string;requestHash?:string;audit:{action:string;actorName:string;actorId:string;at:Date;reason?:string}[]};
const schema=new Schema<Document>({propertyId:{type:Schema.Types.ObjectId,required:true,index:true},kind:{type:String,enum:["maintenance","payment","payout","generate"],required:true},status:{type:String,required:true},version:{type:Number,default:0},data:{type:Schema.Types.Mixed,required:true},requestKey:{type:String,unique:true,sparse:true,select:false},requestHash:{type:String,select:false},audit:{type:[{_id:false,action:String,actorName:String,actorId:String,at:Date,reason:String}],default:[]}},{timestamps:true});
schema.index({propertyId:1,kind:1,status:1});
export const ManagementOperation=(mongoose.models.ManagementOperation as mongoose.Model<Document>)||mongoose.model<Document>("ManagementOperation",schema);
