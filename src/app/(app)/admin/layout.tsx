import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = await requireSession();
  if (!isAdmin) redirect("/dashboard");
  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber">Administrator</p>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
