import { createClient } from "@/lib/supabase/server";

import { SettingsLoadError } from "../settings-load-error";
import { LinksClient } from "./links-client";

export default async function LinksSettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_settings")
    .select("juknis_url, contact_whatsapp")
    .eq("id", true)
    .maybeSingle();

  if (error) return <SettingsLoadError />;

  return (
    <LinksClient currentJuknisUrl={data?.juknis_url ?? null} currentContactWhatsapp={data?.contact_whatsapp ?? null} />
  );
}
