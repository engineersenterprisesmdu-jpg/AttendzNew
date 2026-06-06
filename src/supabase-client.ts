import { createClient } from "@supabase/supabase-js";

// Your specified Supabase connection credentials
export const SUPABASE_URL = "https://bqbphyxpvpwgucutgpbl.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_byuc7-BBsklyQVorbE8kuw_8hD4yBWQ";
export const STORAGE_BUCKET_NAME = "Attendance-files";

// Initialize the Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Uploads a file to the Supabase Storage bucket and returns its public URL.
 * 
 * @param file The file to upload.
 * @param folder A folder path (e.g. 'aadhaar' or 'pan').
 * @param employeeId The associate employee ID to organize files in folders.
 * @returns Object with publicUrl, or throws an error.
 */
export async function uploadToSupabaseStorage(
  file: File,
  folder: "aadhaar" | "pan",
  employeeId: string
): Promise<{ publicUrl: string; path: string }> {
  // Sanitize file name to avoid path issues
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const timestamp = Date.now();
  const filePath = `${employeeId}/${folder}_${timestamp}_${sanitizedName}`;

  // Perform upload
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error("Supabase Storage Upload Error details:", error);
    throw new Error(error.message || "Failed to upload file to Supabase Storage");
  }

  // Retrieve public URL
  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    publicUrl: publicUrlData.publicUrl,
    path: data.path,
  };
}
