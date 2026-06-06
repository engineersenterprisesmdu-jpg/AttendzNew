import { supabase } from "./supabase-client";

export const SYNC_TABLE_NAME = "attendx_sync";

export interface SupabaseSyncRow {
  collection_name: string;
  doc_id: string;
  data: any;
  updated_at?: string;
}

/**
 * Checks if the Supabase table exists by doing a low-cost SELECT query.
 */
export async function checkSupabaseTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(SYNC_TABLE_NAME)
      .select("doc_id")
      .limit(1);
    
    if (error) {
      if (error.code === "PGRST116" || error.code === "42P01") {
        // PGRST116: no rows or 42P01: table does not exist
        return false;
      }
      console.warn("Table check returned unexpected error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to check if Supabase table exists:", err);
    return false;
  }
}

/**
 * Writes/Saves a document to Supabase (Upsert).
 */
export async function supabaseSetDoc(collectionName: string, docId: string, data: any): Promise<void> {
  try {
    console.log(`[Supabase DB] Writing to ${collectionName}/${docId}...`);
    // Ensure id is part of the data object so we don't lose it
    const updatedData = { ...data };
    
    const { error } = await supabase
      .from(SYNC_TABLE_NAME)
      .upsert(
        {
          collection_name: collectionName,
          doc_id: docId,
          data: updatedData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "collection_name,doc_id" }
      );

    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error(`[Supabase DB] Error in supabaseSetDoc for ${collectionName}/${docId}:`, error);
    throw new Error(error.message || `Failed to save ${collectionName} to Supabase`);
  }
}

/**
 * Deletes a document from Supabase.
 */
export async function supabaseDeleteDoc(collectionName: string, docId: string): Promise<void> {
  try {
    console.log(`[Supabase DB] Deleting from ${collectionName}/${docId}...`);
    const { error } = await supabase
      .from(SYNC_TABLE_NAME)
      .delete()
      .match({ collection_name: collectionName, doc_id: docId });

    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error(`[Supabase DB] Error in supabaseDeleteDoc for ${collectionName}/${docId}:`, error);
    throw new Error(error.message || `Failed to delete ${collectionName} from Supabase`);
  }
}

/**
 * Fetches all documents inside a collection.
 */
export async function supabaseFetchCollection(collectionName: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from(SYNC_TABLE_NAME)
      .select("data")
      .eq("collection_name", collectionName);

    if (error) {
      throw error;
    }

    return (data || []).map((row: any) => row.data);
  } catch (error: any) {
    console.error(`[Supabase DB] Error fetching collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Sets up a listener for a collection.
 * Combines an initial fetch, Realtime PostgreSQL subscription, and periodic polling
 * to guarantee instantaneous state synchronization even if Realtime is not fully enabled in Supabase!
 * 
 * @param collectionName Name of the collection
 * @param onUpdate Callback with loaded documents array
 * @param onStatusChange Callback to notify if connection is healthy
 */
export function supabaseListenCollection(
  collectionName: string,
  onUpdate: (data: any[]) => void,
  onStatusChange?: (connected: boolean) => void
): { unsubscribe: () => void } {
  let active = true;
  let lastPulledTimestamp = 0;

  // 1. Initial Fetch
  const fetchAndTrigger = async () => {
    if (!active) return;
    try {
      const list = await supabaseFetchCollection(collectionName);
      if (active) {
        onUpdate(list);
        if (onStatusChange) onStatusChange(true);
        lastPulledTimestamp = Date.now();
      }
    } catch (err) {
      console.warn(`[Supabase DB] Initial fetch failed for '${collectionName}'. Retrying...`);
      if (onStatusChange) onStatusChange(false);
    }
  };

  fetchAndTrigger();

  // 2. Realtime Subscription
  const channel = supabase
    .channel(`realtime_${collectionName}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: SYNC_TABLE_NAME,
        filter: `collection_name=eq.${collectionName}`,
      },
      (payload: any) => {
        console.log(`[Supabase Realtime] Event detected for ${collectionName}:`, payload);
        fetchAndTrigger();
      }
    )
    .subscribe((status) => {
      console.log(`[Supabase Sub] Status for ${collectionName}:`, status);
    });

  // 3. Smart poll backup (every 5 seconds) to handle offline states, standard non-realtime setups, or DB lag
  const pollInterval = setInterval(() => {
    // Only pull if we haven't pulled in the last 4 seconds
    if (active && Date.now() - lastPulledTimestamp > 4000) {
      fetchAndTrigger();
    }
  }, 5000);

  return {
    unsubscribe: () => {
      active = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      console.log(`[Supabase DB] Unsubscribed listener for ${collectionName}`);
    },
  };
}
