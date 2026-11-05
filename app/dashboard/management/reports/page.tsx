import { Suspense } from "react";
import { Reports } from "@/components/management/Reports";
export const metadata={title:"Management reports",robots:{index:false,follow:false}};
export default function ReportsPage(){return <Suspense><Reports /></Suspense>;}
