import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { ExamDateProvider } from "@/components/exam-date";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin, examDate } = await requireSession();
  return (
    <ExamDateProvider value={examDate}>
      <AppShell isAdmin={isAdmin} examDate={examDate} name={profile?.full_name ?? null}>{children}</AppShell>
    </ExamDateProvider>
  );
}
