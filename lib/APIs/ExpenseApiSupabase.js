import { supabase, isSupabaseConfigured } from "../supabase";

// Helper function to check Supabase configuration
const checkSupabaseConfig = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please set up your Supabase project and environment variables.');
  }
  if (!supabase) {
    throw new Error('Supabase client not initialized. Please check your configuration.');
  }
};

/**
 * Uploads a receipt image to the `receipts` bucket.
 *
 * @param imageAsset  – Either a string URI (e.g. "file://…") or an object that contains a `.uri` property.
 * @param userId      – UUID of the authenticated user.
 * @returns Public URL of the uploaded image (or throws on error).
 */
export const uploadReceiptImage = async (imageAsset, userId) => {
  if (!imageAsset) return null;

  // -------------------------------------------------
  // 1️⃣ Resolve the URI
  // -------------------------------------------------
  const isObject = typeof imageAsset === 'object' && imageAsset?.uri;
  const uri = isObject ? imageAsset.uri : imageAsset; // string URI

  // -------------------------------------------------
  // 2️⃣ Build a unique file name inside the user folder
  // -------------------------------------------------
  // Grab extension – fallback to jpg if we can’t determine one
  const rawName = isObject && imageAsset.fileName
    ? imageAsset.fileName
    : `receipt_${Date.now()}.jpg`;
  const ext = rawName.split('.').pop() ?? 'jpg';
  const fileName = `${userId}/receipts/${Date.now()}.${ext}`;

  // -------------------------------------------------
  // 3️⃣ Prepare file for React Native upload
  // -------------------------------------------------
  // Use expo-file-system for React Native compatibility
  const FileSystem = require('expo-file-system');

  // For React Native, we can upload the file directly using the URI
  // Supabase supports direct file upload from local URIs in React Native
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists) {
    throw new Error('File does not exist at the specified URI');
  }

  // Read file as base64 for upload
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 to buffer for upload
  const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  // -------------------------------------------------
  // 4️⃣ Upload to Supabase Storage
  // -------------------------------------------------
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(fileName, buffer, {
      // Set the MIME type
      contentType: `image/${ext}`,
      cacheControl: '3600', // 1 hour caching
      upsert: false,        // keep the safe‑unique file name
    });

  if (uploadError) {
    throw new Error(`Supabase upload error: ${uploadError.message}`);
  }

  // -------------------------------------------------
  // 5️⃣ Get a public URL (bucket must be public)
  // -------------------------------------------------
  const { data: urlData, error: urlError } = supabase.storage
    .from('receipts')
    .getPublicUrl(fileName);

  if (urlError) {
    throw new Error(`Failed to generate public URL: ${urlError.message}`);
  }

  // urlData.publicUrl is the fully qualified HTTPS URL
  return urlData.publicUrl;
};

export const addExpenses = async (newExpense, userId, customCreatedAt = null) => {
  checkSupabaseConfig();

  let receiptImageUrl = null;

  // Upload receipt image if provided
  if (newExpense.receiptImage) {
    receiptImageUrl = await uploadReceiptImage(newExpense.receiptImage, userId);
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      amount: newExpense.amount,
      description: newExpense.description,
      category_id: newExpense.categoryId,
      user_id: userId,
      receipt_image: receiptImageUrl,
      created_at: customCreatedAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchAllExpenses = async (userId) => {
  try {
    checkSupabaseConfig();

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        categories (
          id,
          category_name
        )
      `)
      .eq('user_id', userId) // userId must be a UUID string
      .order('created_at', { ascending: false });

    if (error) throw error; // bubbles the exact Supabase error

    return data ?? []; // always return an array
  } catch (err) {
    console.error('Error fetching expenses:', err);
    return []; // fallback – UI can handle empty list
  }
};

// Helper function to get receipt image URL (already stored as full URL)
export const getReceiptImageUrl = (imageUrl) => {
  return imageUrl; // Supabase stores full URLs
};

export const deleteExpenseById = async (expenseId) => {
  checkSupabaseConfig();

  const { data, error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const expensesOfCategory = async (categoryId) => {
  checkSupabaseConfig();

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const deleteAllExpensesById = async (ids) => {
  checkSupabaseConfig();

  const batchSize = 50; // Supabase can handle larger batches
  let deletedCount = 0;
  let failedCount = 0;

  // Process items in batches
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);

    try {
      const { data, error } = await supabase
        .from('expenses')
        .delete()
        .in('id', batch)
        .select('id');

      if (error) throw error;
      deletedCount += data?.length || 0;

    } catch (error) {
      failedCount += batch.length;
      console.error(`Batch deletion failed for batch starting at ${i}:`, error);
    }
  }

  if (failedCount > 0) {
    throw new Error(`Deleted ${deletedCount} items, but ${failedCount} failed`);
  }

  return true;
};

// Bulk import function for CSV data with date preservation
export const bulkImportExpenses = async (expensesData, userId) => {
  checkSupabaseConfig();

  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  const batchSize = 100; // Supabase can handle larger batches

  // Process expenses in batches
  for (let i = 0; i < expensesData.length; i += batchSize) {
    const batch = expensesData.slice(i, i + batchSize);

    try {
      // Prepare batch data
      const batchData = batch.map((expenseData, index) => ({
        amount: expenseData.amount,
        description: expenseData.description,
        category_id: expenseData.categoryId,
        user_id: userId,
        receipt_image: null, // No receipt images for bulk import
        created_at: expenseData.createdAt || new Date().toISOString(),
      }));

      // Insert batch
      const { data, error } = await supabase
        .from('expenses')
        .insert(batchData)
        .select('id');

      if (error) throw error;

      results.success += data?.length || 0;

    } catch (error) {
      // Handle batch-level errors
      batch.forEach((_, index) => {
        results.failed++;
        results.errors.push(`Row ${i + index + 1}: ${error.message}`);
      });
    }
  }

  return results;
};

// Search expenses with filters
export const searchExpenses = async (userId, filters = {}) => {
  checkSupabaseConfig();

  let query = supabase
    .from('expenses')
    .select(`
      *,
      categories (
        id,
        category_name
      )
    `)
    .eq('user_id', userId);

  // Apply text search filter
  if (filters.query) {
    query = query.or(`description.ilike.%${filters.query}%,amount::text.ilike.%${filters.query}%`);
  }

  // Apply category filter
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  // Apply date range filter
  if (filters.dateRange) {
    const now = new Date();
    let startDate;

    switch (filters.dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = null;
    }

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
  }

  // Order by creation date (newest first)
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};
