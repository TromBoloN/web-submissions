export const roleLabels = { admin: "Admin", judge: "Juri", team: "Peserta" } as const;
export const stageLabels = { preliminary: "Preliminary", final: "Final", both: "Keduanya" } as const;

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
  }).format(new Date(value));
}

export function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}
