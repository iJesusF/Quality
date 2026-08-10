import { LiveDashboard } from "@/components/live-dashboard";
import { getDashboardData } from "@/lib/dashboard";
export const dynamic = "force-dynamic";
export default async function DashboardPage() { return <LiveDashboard data={await getDashboardData()} />; }
