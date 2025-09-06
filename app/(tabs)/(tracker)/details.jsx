import { ActivityIndicator, Text, View } from "react-native";
import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, RefreshControl } from "react-native";
import { expensesOfCategory } from "../../../lib/APIs/ExpenseApiSupabase";
import useAlertContext from "../../../context/AlertProvider";

// Memoized Category Header Component
const CategoryHeader = memo(({ title }) => (
  <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 w-full mb-8">
    <Text className="text-3xl text-cyan-100 font-pbold text-center">
      Category: {title}
    </Text>
  </View>
));

// Memoized Expense Item Component
const ExpenseItem = memo(({ expense, formatDate }) => (
  <View className="bg-white p-4 rounded-lg mb-2 w-full flex-row justify-between">
    <View className="flex-1 mr-3">
      <Text 
        className="font-pmedium text-gray-800"
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {expense.description}
      </Text>
      <Text className="text-gray-500 text-sm mt-1">
        {formatDate(expense.created_at)}
      </Text>
    </View>
    <View className="justify-center">
      <Text className="text-lg font-psemibold text-green-600">
        Rs {parseFloat(expense.amount).toFixed(2)}
      </Text>
    </View>
  </View>
));

// Memoized Expenses List Component
const ExpensesList = memo(({ expenses, formatDate }) => {
  if (expenses.length === 0) {
    return (
      <Text className="text-cyan-100 font-pbold text-lg">
        No expenses found.
      </Text>
    );
  }

  return expenses.map((expense) => (
    <ExpenseItem key={expense.id} expense={expense} formatDate={formatDate} />
  ));
});

const Details = () => {
  const params = useLocalSearchParams();

  // Memoize params processing
  const { categoryId, title } = useMemo(
    () => ({
      categoryId: Array.isArray(params.categoryId)
        ? params.categoryId[0]
        : params.categoryId,
      title: Array.isArray(params.title) ? params.title[0] : params.title,
    }),
    [params.categoryId, params.title]
  );

  const [expenses, setExpenses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlertContext();

  // Memoized date formatter
  const formatDate = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  // Memoized fetch function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await expensesOfCategory(categoryId);
      setExpenses(result);
    } catch (error) {
      showAlert("Error", `Failed to fetch expenses! ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  // Memoized refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (error) {
      showAlert(
        "Error",
        `Failed to refresh expenses! ${error.message}`,
        "error"
      );
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  // Effect for initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoized refresh control
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        onRefresh={onRefresh}
        refreshing={refreshing}
        tintColor="#fff"
        titleColor="#fff"
      />
    ),
    [onRefresh, refreshing]
  );

  return (
    <SafeAreaView className="flex-1 bg-pink-900 justify-center">
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5C94C8" />
        </View>
      ) : (
        <ScrollView refreshControl={refreshControl}>
          <View className="flex-1 px-6 items-center">
            <CategoryHeader title={title} />
            <ExpensesList expenses={expenses} formatDate={formatDate} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default React.memo(Details);
