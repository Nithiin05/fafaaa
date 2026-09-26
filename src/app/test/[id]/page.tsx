import { TestRunner } from "@/components/test-runner";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Test in progress" };

export default async function TestPage({ params }: { params: { id: string } }) {
  const { examDate } = await requireSession();
  return <TestRunner attemptId={params.id} examDate={examDate} />;
}
