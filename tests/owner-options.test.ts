import test from "node:test";
import assert from "node:assert/strict";
import {ownerOptionsPipeline} from "../lib/owners";
test("saved owner options are scoped, bounded and exclude unrelated private property data",()=>{
 const stages=ownerOptionsPipeline(true,"",2);
 assert.deepEqual(stages[0],{$match:{"owner.name":{$type:"string",$ne:""},"owner.phone":{$type:"string",$ne:""},category:"build"}});
 assert.deepEqual(stages[4],{$skip:25});assert.deepEqual(stages[5],{$limit:26});
 const projection=stages[6] as {$project:Record<string,unknown>};assert.deepEqual(Object.keys(projection.$project),["_id","id","name","phone","email","notes"]);
});
test("owner search treats phone/name regex characters literally",()=>{
 const stage=ownerOptionsPipeline(false,"+966 (55).*",1)[0] as {$match:Record<string,unknown>};
 assert.deepEqual(stage.$match.$or,[{"owner.name":{$regex:"\\+966 \\(55\\)\\.\\*",$options:"i"}},{"owner.phone":{$regex:"\\+966 \\(55\\)\\.\\*",$options:"i"}}]);
});
