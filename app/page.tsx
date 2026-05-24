import { cookies } from "next/headers";
import { validateSession } from "@/lib/auth";
import DashboardClient from "@/components/dashboard-client";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const session = validateSession(cookieHeader);
  if (!session.valid) redirect("/");

  return <DashboardClient />;
}
