import { createClient } from "@/lib/supabase/server";

import { SettingsLoadError } from "../settings-load-error";
import { ScheduleClient } from "./schedule-client";

export default async function ScheduleSettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_stages")
    .select(
      "key, title, description, starts_on, ends_on, time_label, sort_order, show_on_track, status_override, is_system, updated_at",
    )
    .order("sort_order")
    .order("starts_on");

  if (error || !data) return <SettingsLoadError />;

  return <ScheduleClient stages={data} />;
}
