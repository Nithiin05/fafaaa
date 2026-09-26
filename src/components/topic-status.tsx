import { Badge } from "@/components/ui";
import { TOPIC_STATUS } from "@/lib/exam";

export function TopicStatus({ status }: { status: string }) {
  const s = TOPIC_STATUS[status] ?? TOPIC_STATUS.not_started;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
