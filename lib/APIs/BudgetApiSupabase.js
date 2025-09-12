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

// Create a new budget
export const createBudget = async (budgetData) => {
  checkSupabaseConfig();

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      name: budgetData.name,
      category_id: budgetData.category_id,
      amount: budgetData.amount,
      period: budgetData.period,
      user_id: budgetData.user_id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get all budgets for a user
export const getBudgets = async (userId) => {
  checkSupabaseConfig();

  const { data, error } = await supabase
    .from('budgets')
    .select(`
      *,
      categories (
        id,
        category_name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Update a budget
export const updateBudget = async (budgetId, budgetData) => {
  checkSupabaseConfig();

  const { data, error } = await supabase
    .from('budgets')
    .update({
      name: budgetData.name,
      category_id: budgetData.category_id,
      amount: budgetData.amount,
      period: budgetData.period,
      updated_at: new Date().toISOString(),
    })
    .eq('id', budgetId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a budget
export const deleteBudget = async (budgetId) => {
  checkSupabaseConfig();

  const { data, error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', budgetId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get current spending for a budget period
export const getBudgetSpending = async (budgetId, userId) => {
  checkSupabaseConfig();

  // First get the budget details
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', budgetId)
    .single();

  if (budgetError) throw budgetError;

  // Calculate date range based on budget period
  const now = new Date();
  let startDate;

  switch (budget.period) {
    case 'weekly':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week
      startOfWeek.setHours(0, 0, 0, 0);
      startDate = startOfWeek;
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Default to monthly
  }

  // Get expenses for the category within the period
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('amount')
    .eq('user_id', userId)
    .eq('category_id', budget.category_id)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', now.toISOString());

  if (expensesError) throw expensesError;

  // Calculate total spending
  const totalSpending = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  return totalSpending;
};

// Get budget analytics for a user
export const getBudgetAnalytics = async (userId) => {
  checkSupabaseConfig();

  const budgets = await getBudgets(userId);
  
  const analytics = await Promise.all(
    budgets.map(async (budget) => {
      const currentSpending = await getBudgetSpending(budget.id, userId);
      const percentage = (currentSpending / budget.amount) * 100;
      
      return {
        ...budget,
        currentSpending,
        percentage: Math.min(percentage, 100),
        isOverBudget: percentage > 100,
        remaining: Math.max(budget.amount - currentSpending, 0),
        overspent: Math.max(currentSpending - budget.amount, 0)
      };
    })
  );

  return {
    budgets: analytics,
    totalBudgets: analytics.length,
    overBudgetCount: analytics.filter(b => b.isOverBudget).length,
    totalBudgetAmount: analytics.reduce((sum, b) => sum + b.amount, 0),
    totalSpending: analytics.reduce((sum, b) => sum + b.currentSpending, 0),
  };
};
