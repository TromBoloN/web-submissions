import { createClient } from "@/lib/supabase/server";

import { SettingsLoadError } from "../settings-load-error";
import { ContentClient } from "./content-client";

export default async function ContentSettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_content").select("key, value, updated_at");

  if (error || !data) return <SettingsLoadError />;

  return <ContentClient saved={data} />;
}
