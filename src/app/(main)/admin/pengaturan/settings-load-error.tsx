import { SETTINGS_LOAD_ERROR } from "./settings-utils";

export function SettingsLoadError() {
  return (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
      {SETTINGS_LOAD_ERROR}
    </p>
  );
}
