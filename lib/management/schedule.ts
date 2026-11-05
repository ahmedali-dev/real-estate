/** Contracted installments only; does not create payments or prorate partial months. */
export function leaseSchedule(firstDueDate:string,endDate:string,frequency:string,amount:number){
  const months:Record<string,number>={monthly:1,quarterly:3,semiannual:6,annual:12};
  const step=months[frequency],first=new Date(firstDueDate+"T00:00:00Z");
  if(!step||!Number.isFinite(first.getTime())||!Number.isFinite(amount)||amount<=0)return [];
  const result:{dueDate:string;amount:number}[]=[];
  for(let i=0;i<241;i++){
    const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+step*i+1,0));
    const due=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+step*i,Math.min(first.getUTCDate(),last.getUTCDate()))).toISOString().slice(0,10);
    if(due>endDate)break;
    result.push({dueDate:due,amount});
  }
  return result;
}
