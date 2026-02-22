import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireActiveUser } from "@/lib/api-utils";
import { uploadBase64Image, STORAGE_BUCKETS, generateFilePath } from "@/lib/supabase";

// POST - Upload an image to Supabase storage
export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { image, type, bucket } = body;

    console.log('[Upload] Starting upload for:', { type, bucket, userId: user.id });

    // Validation
    if (!image) {
      console.error('[Upload] No image data provided');
      return apiError("Image data is required");
    }

    if (!type) {
      console.error('[Upload] No type provided');
      return apiError("Image type is required (e.g., 'logo', 'banner', 'player')");
    }

    // Determine bucket
    const targetBucket = bucket || STORAGE_BUCKETS.TEAMS;
    
    // Validate bucket name
    const validBuckets = Object.values(STORAGE_BUCKETS);
    if (!validBuckets.includes(targetBucket)) {
      console.error('[Upload] Invalid bucket:', targetBucket);
      return apiError(`Invalid bucket. Must be one of: ${validBuckets.join(', ')}`);
    }

    // Generate unique file path
    const filePath = generateFilePath(type, user.id, type);
    console.log('[Upload] Generated file path:', filePath);

    // Upload to Supabase
    const { url, error } = await uploadBase64Image(targetBucket, filePath, image);

    if (error) {
      console.error("[Upload] Supabase upload error:", error);
      return apiError(`Failed to upload image: ${error.message}`, 500);
    }

    console.log("[Upload] Upload successful:", url);

    return apiSuccess({
      url,
      path: filePath,
      bucket: targetBucket,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[Upload] Route error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to upload image",
      500
    );
  }
}
