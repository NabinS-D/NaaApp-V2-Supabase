import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useGlobalContext } from '../context/GlobalProvider';
import { fetchAllExpenses } from '../lib/APIs/ExpenseApiSupabase';
import { fetchAllCategories } from '../lib/APIs/CategoryApiSupabase';

const Insights = () => {
  const { userdetails } = useGlobalContext();
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userdetails) {
      generateInsight();
    }
  }, [userdetails]);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const expenses = await fetchAllExpenses(userdetails.id);
      const categoriesResponse = await fetchAllCategories(userdetails.id);
      const categories = categoriesResponse || [];
      const categoryMap = categories.reduce((acc, category) => {
        acc[category.id] = category.category_name;
        return acc;
      }, {});

      if (expenses.length === 0) {
        setInsight('No spending data yet. Start tracking to get insights!');
        return;
      }

      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const monthlySpending = expenses.reduce((acc, expense) => {
        const expenseDate = new Date(expense.createdAt);
        const month = expenseDate.getUTCMonth();
        const year = expenseDate.getUTCFullYear();
        const categoryId = expense.category?.id || 'uncategorized';

        if (!acc[year]) acc[year] = {};
        if (!acc[year][month]) acc[year][month] = {};
        if (!acc[year][month][categoryId]) acc[year][month][categoryId] = 0;

        acc[year][month][categoryId] += expense.amount;
        return acc;
      }, {});

      const currentMonthSpending = monthlySpending[currentYear]?.[currentMonth] || {};
      const lastMonthSpending = monthlySpending[lastMonthYear]?.[lastMonth] || {};

      let maxIncrease = 0;
      let insightCategory = null;
      let newSpendingCategory = null;
      let maxNewSpend = 0;

      Object.keys(currentMonthSpending).forEach(categoryId => {
        const currentAmount = currentMonthSpending[categoryId] || 0;
        const lastAmount = lastMonthSpending[categoryId] || 0;

        if (lastAmount > 0) {
          const increase = ((currentAmount - lastAmount) / lastAmount) * 100;
          if (increase > maxIncrease) {
            maxIncrease = increase;
            insightCategory = categoryId;
          }
        } else if (currentAmount > 0 && lastAmount === 0) {
          if (currentAmount > maxNewSpend) {
            maxNewSpend = currentAmount;
            newSpendingCategory = categoryId;
          }
        }
      });

      if (insightCategory && maxIncrease > 20) { // Only show if increase is significant
        const categoryName = categoryMap[insightCategory];
        setInsight(`Spending on ${categoryName} is up by ${maxIncrease.toFixed(0)}% this month.`);
      } else if (newSpendingCategory) {
        const categoryName = categoryMap[newSpendingCategory];
        setInsight(`You've started spending on ${categoryName} this month, totaling Rs ${maxNewSpend.toFixed(2)}.`);
      } else {
        setInsight('Your spending pattern is consistent. Well done!');
      }
    } catch (error) {
      console.error('Error generating insight:', error);
      setInsight('Could not generate insights at this time.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="bg-gray-800 p-4 rounded-lg my-4 mx-2">
      <Text className="text-white font-pbold text-lg mb-2">Spending Insights</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <Text className="text-gray-300 font-pregular">{insight}</Text>
      )}
    </View>
  );
};

export default Insights;
