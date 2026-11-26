import { createClient } from "@/lib/supabase/server";

import { SettingsLoadError } from "../settings-load-error";
import { IdentityClient } from "./identity-client";

export default async function IdentitySettingsPage() {
  const supabase = await createClient();
  const [settingsRes, finalRes] = await Promise.all([
    supabase
      .from("competition_settings")
      .select("event_name, event_track, finalist_count, gallery_new_badge_days")
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("final_presentation")
      .select("presentation_minutes, qa_minutes, venue, meeting_url, note, logistics_published, updated_at")
      .eq("id", true)
      .maybeSingle(),
  ]);

  if (settingsRes.error || finalRes.error || !settingsRes.data || !finalRes.data) return <SettingsLoadError />;

  return <IdentityClient identity={settingsRes.data} final={finalRes.data} />;
}
