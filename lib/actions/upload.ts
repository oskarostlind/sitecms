/**
 * Delade konstanter för bilduppladdning. Används av både API-routen
 * (app/api/upload/route.ts) och klientkomponenten som initierar uppladdning
 * (components/admin/ImageField.tsx) så att gränserna aldrig kan glida
 * isär mellan klient och server.
 */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

export function isAllowedImageType(type: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

export function formatMaxUploadSize(): string {
  return `${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`;
}
