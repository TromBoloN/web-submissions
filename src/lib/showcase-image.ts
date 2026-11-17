// Gallery card image helpers shared by the team "Atur Tampilan" page and the admin finalist editor.

export const SHOWCASE_BUCKET = "web-showcase";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;
const SHOWCASE_ASPECT = 16 / 10;

export function getPublicImageUrl(supabaseUrl: string, path: string | null): string | null {
  if (!path || !supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/web-showcase/${path}`;
}

export async function resizeImage(file: File): Promise<{ blob: Blob; extension: string }> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Format gambar harus PNG, JPEG, atau WebP.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Ukuran gambar maksimal 2 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const sourceAspect = bitmap.width / bitmap.height;
  const cropWidth = sourceAspect > SHOWCASE_ASPECT ? Math.round(bitmap.height * SHOWCASE_ASPECT) : bitmap.width;
  const cropHeight = sourceAspect > SHOWCASE_ASPECT ? bitmap.height : Math.round(bitmap.width / SHOWCASE_ASPECT);
  const cropX = Math.round((bitmap.width - cropWidth) / 2);
  const cropY = Math.round((bitmap.height - cropHeight) / 2);

  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(cropWidth, cropHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropWidth * scale));
  canvas.height = Math.max(1, Math.round(cropHeight * scale));
  canvas.getContext("2d")?.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, 0.85));
  if (!blob || blob.size > MAX_IMAGE_BYTES) {
    throw new Error("Gambar terlalu besar setelah diproses. Gunakan gambar yang lebih kecil.");
  }

  return { blob, extension: file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] };
}
