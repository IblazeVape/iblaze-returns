import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth";
import DashboardClient from "@/components/dashboard-client";

export default async function HomePage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const session = validateSession(cookieHeader);

  if (!session.valid) {
    redirect("/api/login");
  }

  return <DashboardClient />;
}
