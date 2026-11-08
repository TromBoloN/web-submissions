import "server-only";

import { adminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type AuditMetadata = Record<string, Json>;

export async function logAuditEvent(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: AuditMetadata;
}): Promise<void> {
  const { error } = await adminClient.from("audit_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("Failed to write audit log", {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      error: error.message,
    });
  }
}
