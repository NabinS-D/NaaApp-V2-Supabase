import { supabase } from "./supabase";

// Config object using environment variables
export const config = {
  aiKey: process.env.EXPO_PUBLIC_AI_KEY,
  aiImageEndpoint: process.env.EXPO_PUBLIC_AI_IMAGE_ENDPOINT,
  platform: process.env.EXPO_PUBLIC_PLATFORM,
};

// Use Supabase client for database operations
export const databases = {
  createDocument: async (databaseId, collectionId, documentId, data) => {
    // Map to Supabase table operations
    const tableName = collectionId === 'ai_chats' ? 'ai_chats' : collectionId;
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },
  
  listDocuments: async (databaseId, collectionId, queries = []) => {
    const tableName = collectionId === 'ai_chats' ? 'ai_chats' : collectionId;
    let query = supabase.from(tableName).select('*');
    
    // Apply queries if provided
    queries.forEach(q => {
      if (q.method === 'equal') {
        query = query.eq(q.attribute, q.values[0]);
      } else if (q.method === 'orderDesc') {
        query = query.order(q.attribute, { ascending: false });
      }
    });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return { documents: data || [] };
  }
};
