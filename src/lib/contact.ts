const WHATSAPP_DIGITS = /\D/g;

export function normalizeWhatsAppNumber(input: string): string {
  const digits = input.replace(WHATSAPP_DIGITS, "");

  // Local Indonesian numbers start with 0; WhatsApp links require the 62 prefix.
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export function toWhatsAppUrl(number: string): string {
  return `https://wa.me/${normalizeWhatsAppNumber(number)}`;
}

export function formatWhatsAppNumber(number: string | null | undefined): string | null {
  if (!number) {
    return null;
  }

  const digits = normalizeWhatsAppNumber(number);

  if (!digits) {
    return null;
  }

  if (digits.startsWith("62") && digits.length > 2) {
    const groups = digits.slice(2).match(/.{1,4}/g);
    return `+62 ${groups?.join(" ") ?? digits.slice(2)}`;
  }

  return `+${digits}`;
}
