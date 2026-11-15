import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Keep under Vercel's 4.5 MB serverless request payload limit
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function verifyImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === "image/gif") {
    const header = buffer.subarray(0, 4).toString("ascii");
    return header === "GIF8";
  }
  if (mimeType === "image/webp") {
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    return riff === "RIFF" && webp === "WEBP";
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(`upload:post:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait a moment." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected multipart/form-data body" },
        { status: 400 }
      );
    }

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "An image file is required under field 'file'" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Unsupported image type. Allowed formats: JPEG, PNG, WebP, GIF.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 4 MB limit." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!verifyImageMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "Invalid image file contents." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    if (supabase) {
      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const safeExt = extMap[file.type] ?? "jpg";
      const filePath = `listings/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          {
            error: "Failed to upload image to storage",
            details: uploadError.message,
          },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("listing-images").getPublicUrl(filePath);

      return NextResponse.json(
        {
          imageUrl: publicUrl,
          path: filePath,
          source: "supabase",
        },
        { status: 201 }
      );
    }

    // Fallback data URL when Supabase env vars are not configured
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json(
      {
        imageUrl: dataUrl,
        path: null,
        source: "mock",
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Unexpected server error while uploading image",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
