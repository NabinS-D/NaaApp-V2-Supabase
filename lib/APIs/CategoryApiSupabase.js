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

export const fetchAllCategories = async (userId) => {
  checkSupabaseConfig();
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [] ; // Match Appwrite response format
};

export const addaCategory = async (newCategory, userId) => {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('categories')
    .insert({
      category_name: newCategory.name,
      user_id: userId,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const categoryByID = async (categoryId) => {
  checkSupabaseConfig();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error) throw error;
  return data;
};

export const handleEditCategory = async (categoryId, newCategoryName) => {
  checkSupabaseConfig();

  const { data, error } = await supabase
    .from('categories')
    .update({ category_name: newCategoryName })
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCategoryByID = async (categoryId) => {
  checkSupabaseConfig();

  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Import expenses functions for cascade delete
const expensesOfCategory = async (categoryId) => {
  checkSupabaseConfig();

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('category_id', categoryId);

  if (error) throw error;
  return data || [];
};

const deleteAllExpensesById = async (ids) => {
  checkSupabaseConfig();

  const batchSize = 50;
  let deletedCount = 0;
  let failedCount = 0;

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
    }
  }

  if (failedCount > 0) {
    throw new Error(`Deleted ${deletedCount} items, but ${failedCount} failed`);
  }

  return true;
};

// Delete category and all its related expenses (cascade delete)
export const deleteCategoryWithExpenses = async (categoryId) => {
  try {
    // Step 1: Get all expenses for this category
    const categoryExpenses = await expensesOfCategory(categoryId);

    // Step 2: If there are expenses, delete them first
    if (categoryExpenses && categoryExpenses.length > 0) {
      const expenseIds = categoryExpenses.map(expense => expense.id);
      await deleteAllExpensesById(expenseIds);
    }

    // Step 3: Delete the category itself
    const response = await deleteCategoryByID(categoryId);

    return {
      success: true,
      deletedExpenses: categoryExpenses ? categoryExpenses.length : 0,
      categoryResponse: response
    };
  } catch (error) {
    throw new Error(`Failed to delete category and expenses: ${error.message}`);
  }
};
