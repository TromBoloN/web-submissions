import { createClient } from "@/lib/supabase/server";

import { SettingsLoadError } from "../settings-load-error";
import { DeadlineClient } from "./deadline-client";

export default async function SubmissionSettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_settings")
    .select("submission_closes_at, updated_at")
    .eq("id", true)
    .maybeSingle();

  if (error) return <SettingsLoadError />;

  return <DeadlineClient currentClosesAt={data?.submission_closes_at ?? null} updatedAt={data?.updated_at ?? null} />;
}
