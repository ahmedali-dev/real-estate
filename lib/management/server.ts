import { Types, type ClientSession } from "mongoose";
import { Property } from "@/models/Property";
import { ManagementRecord } from "@/models/ManagementRecord";
import { isBuildOnlyRole } from "@/lib/auth/requireSession";
import type { UserRole } from "@/types/user";
import type { RecordKind } from "./records";

export const validId = (id: string) => /^[a-f\d]{24}$/i.test(id);
export function propertyScope(id:string,role:UserRole) { return {_id:id,...(isBuildOnlyRole(role)?{category:"build"}:{})}; }
export class ManagementError extends Error { constructor(message:string,public status=400){super(message);} }
export async function validateLinks(propertyId:string,kind:RecordKind,data:Record<string,unknown>,session:ClientSession,excludeId?:string) {
  const property=await Property.findById(propertyId).session(session).select("category units").lean();
  if(!property)throw new ManagementError("Property not found.",404);
  const unit=String(data.unit||"");
  if(unit && (property.category!=="build" || property.units.filter(u=>u.number===unit).length!==1))throw new ManagementError("Choose a uniquely numbered building unit.");
  if(kind==="lease" && property.category==="land")throw new ManagementError("Land listings do not support leases.");
  for(const [field,targetKind] of [["agreementId","agreement"],["leaseId","lease"]] as const){
    if(!data[field])continue;
    const linked=await ManagementRecord.findOne({_id:data[field],propertyId,kind:targetKind,archived:false}).session(session).lean();
    if(!linked)throw new ManagementError("The linked agreement or lease does not belong to this property.");
    if(field==="leaseId"&&data.agreementId&&linked.data.agreementId!==data.agreementId)throw new ManagementError("The selected lease and agreement do not match.");
    if(linked.data.unit && linked.data.unit!==unit)throw new ManagementError("The linked record covers a different unit.");
    if(kind==="lease" && field==="agreementId"){
      if(data.status==="active"&&linked.data.status!=="active")throw new ManagementError("Activate the management agreement before activating a lease.");
      if(String(data.startDate)<String(linked.data.startDate)||String(data.endDate)>String(linked.data.endDate))throw new ManagementError("Lease dates must fall within the management agreement.");
    }
  }
  if(kind==="agreement"&&data.status==="active"){
    const overlaps=await ManagementRecord.exists({propertyId,kind:"agreement",archived:false,"data.status":"active","data.startDate":{$lte:data.endDate},"data.endDate":{$gte:data.startDate},...(excludeId?{_id:{$ne:new Types.ObjectId(excludeId)}}:{}),...(unit?{$or:[{"data.unit":unit},{"data.unit":""}]}:{})}).session(session);
    if(overlaps)throw new ManagementError("An active management agreement already covers this property or unit during these dates.",409);
  }
  if(kind==="lease" && data.status==="active"){
    const occupied=await ManagementRecord.exists({propertyId,kind:"lease",archived:false,"data.status":"active",...(excludeId?{_id:{$ne:new Types.ObjectId(excludeId)}}:{}),...(unit?{$or:[{"data.unit":unit},{"data.unit":""}]}:{})}).session(session);
    if(occupied)throw new ManagementError("Another active lease already covers this property or unit.",409);
  }
  if(kind==="lease" && excludeId){
    const original=await ManagementRecord.findById(excludeId).session(session).lean();
    if(original&&(original.data.unit!==unit||original.data.agreementId!==data.agreementId)&&await ManagementRecord.exists({archived:false,"data.leaseId":excludeId}).session(session))throw new ManagementError("This lease has linked financial records. Its unit and agreement cannot be changed.",409);
  }
  if(kind==="agreement" && excludeId){
    if(data.status!=="active"&&await ManagementRecord.exists({propertyId,kind:"lease",archived:false,"data.status":"active","data.agreementId":excludeId}).session(session))throw new ManagementError("End active leases before ending the management agreement.",409);
    const lease=await ManagementRecord.findOne({propertyId,kind:"lease",archived:false,"data.agreementId":excludeId,$or:[{"data.startDate":{$lt:data.startDate}},{"data.endDate":{$gt:data.endDate}},...(data.scope==="unit"?[{"data.unit":{$ne:unit}}]:[])]}).session(session).lean();
    if(lease)throw new ManagementError("This agreement change conflicts with an existing lease.",409);
  }
}
