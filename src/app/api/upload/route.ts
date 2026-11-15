import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: NextRequest) {
  try {
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
        { error: "File size exceeds the 10 MB limit." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getSupabaseClient();

    if (supabase) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
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
