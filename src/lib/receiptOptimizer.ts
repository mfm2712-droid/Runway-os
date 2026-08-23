export interface OptimizedReceiptImage {
  base64: string;
  mimeType: string;
}

const MAX_DIMENSION = 1600;
const RETRY_MAX_DIMENSION = 1200;
const INITIAL_QUALITY = 0.85;
const RETRY_QUALITY = 0.6;
// Roughly matches api/parse-receipt.ts's 4.5MB request guard with headroom —
// base64 runs ~33% larger than the underlying bytes.
const MAX_BASE64_CHARS = 1.2 * 1024 * 1024;

type Bitmap = ImageBitmap | HTMLImageElement;

/**
 * Downscales and re-encodes a receipt photo as JPEG before it's uploaded —
 * phone camera photos routinely run 4-12MB, far more than a vision model
 * needs to read a receipt and well past the server's request-size guard.
 * Falls back to the original file's own bytes/mime type, unmodified, if the
 * browser can't decode images via canvas — never blocks the upload, just
 * skips the optimization.
 */
export async function optimizeReceiptImage(file: File): Promise<OptimizedReceiptImage> {
  try {
    const bitmap = await loadBitmap(file);
    try {
      let base64 = await drawAndEncode(bitmap, MAX_DIMENSION, INITIAL_QUALITY);
      if (base64.length > MAX_BASE64_CHARS) {
        base64 = await drawAndEncode(bitmap, RETRY_MAX_DIMENSION, RETRY_QUALITY);
      }
      return { base64, mimeType: "image/jpeg" };
    } finally {
      if ("close" in bitmap) bitmap.close();
    }
  } catch {
    return { base64: await fileToBase64(file), mimeType: file.type || "image/jpeg" };
  }
}

async function loadBitmap(file: File): Promise<Bitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return loadImageElement(file);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't decode image"));
    };
    img.src = url;
  });
}

function bitmapSize(bitmap: Bitmap): { width: number; height: number } {
  return { width: bitmap.width, height: bitmap.height };
}

async function drawAndEncode(bitmap: Bitmap, maxSide: number, quality: number): Promise<string> {
  const { width, height } = bitmapSize(bitmap);
  if (!width || !height) throw new Error("Invalid image dimensions");

  // Only ever downscale — a receipt photo smaller than maxSide is left as-is.
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  const blob = await canvasToBlob(canvas, quality);
  if (blob) return blobToBase64(blob);

  // toBlob unsupported/failed — fall back to the synchronous data URL API.
  return canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== "function") {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
