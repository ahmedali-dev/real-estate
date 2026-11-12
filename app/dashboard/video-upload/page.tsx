import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import { VideoUploadSettings } from "@/components/dashboard/VideoUploadSettings";
export default async function VideoUploadPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=%2Fdashboard%2Fvideo-upload");
  if (session.user.role !== "admin") redirect("/dashboard");
  return <VideoUploadSettings />;
}
