import mongoose,{Schema} from "mongoose";
interface Attachment { recordId:mongoose.Types.ObjectId;name:string;mime:string;size:number;bytes:Buffer }
const schema=new Schema<Attachment>({recordId:{type:Schema.Types.ObjectId,required:true,index:true},name:{type:String,required:true},mime:{type:String,required:true},size:Number,bytes:{type:Buffer,required:true,select:false}},{timestamps:true});
export const ManagementAttachment=(mongoose.models.ManagementAttachment as mongoose.Model<Attachment>)||mongoose.model<Attachment>("ManagementAttachment",schema);
