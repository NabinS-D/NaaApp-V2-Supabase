import { ActivityIndicator, Text, View, Image } from "react-native";
import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { expensesOfCategory } from "../../../lib/APIs/ExpenseApiSupabase";
import useAlertContext from "../../../context/AlertProvider";

// Memoized Detail Row Component
const DetailRow = memo(({ label, value, icon }) => (
  <View className="bg-white p-4 rounded-lg mb-3 flex-row items-center">
    <MaterialIcons name={icon} size={24} color="#4630EB" />
    <View className="ml-4 flex-1">
      <Text className="text-gray-500 text-sm font-pmedium">{label}</Text>
      <Text className="text-gray-800 text-lg font-psemibold">{value}</Text>
    </View>
  </View>
));

// Memoized Receipt Image Component
const ReceiptImage = memo(({ imageUri }) => (
  <View className="bg-white p-4 rounded-lg mb-3">
    <View className="flex-row items-center mb-3">
      <MaterialIcons name="image" size={24} color="#4630EB" />
      <Text className="ml-4 text-gray-800 text-lg font-psemibold">Receipt</Text>
    </View>
    <Image 
      source={{ uri: imageUri }} 
      className="w-full h-64 rounded-lg"
      resizeMode="contain"
    />
  </View>
));

// Memoized Category Header Component (for fallback category view)
const CategoryHeader = memo(({ title }) => (
  <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 w-full mb-8">
    <Text className="text-3xl text-cyan-100 font-pbold text-center">
      Category: {title}
    </Text>
  </View>
));

// Memoized Expense Item Component (for fallback category view)
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

// Memoized Expenses List Component (for fallback category view)
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

  // Memoize params processing for expense details
  const expenseData = useMemo(() => {
    // Check if this is an individual expense detail view
    if (params.expenseId) {
      return {
        expenseId: Array.isArray(params.expenseId) ? params.expenseId[0] : params.expenseId,
        description: Array.isArray(params.description) ? params.description[0] : params.description,
        amount: Array.isArray(params.amount) ? params.amount[0] : params.amount,
        categoryName: Array.isArray(params.categoryName) ? params.categoryName[0] : params.categoryName,
        categoryColor: Array.isArray(params.categoryColor) ? params.categoryColor[0] : params.categoryColor,
        createdAt: Array.isArray(params.createdAt) ? params.createdAt[0] : params.createdAt,
        receiptImage: Array.isArray(params.receiptImage) ? params.receiptImage[0] : params.receiptImage,
      };
    }
    // Fallback to category view
    return {
      categoryId: Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId,
      title: Array.isArray(params.title) ? params.title[0] : params.title,
    };
  }, [params]);

  const [expenses, setExpenses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlertContext();

  // Memoized date formatter
  const formatDate = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      timeZone: "Asia/Kathmandu",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  // Memoized fetch function (only for category view)
  const fetchData = useCallback(async () => {
    if (!expenseData.categoryId) return;
    
    try {
      setLoading(true);
      const result = await expensesOfCategory(expenseData.categoryId);
      setExpenses(result);
    } catch (error) {
      showAlert("Error", `Failed to fetch expenses! ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [expenseData.categoryId]);

  // Memoized refresh handler (only for category view)
  const onRefresh = useCallback(async () => {
    if (!expenseData.categoryId) return;
    
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

  // Effect for initial data fetch (only for category view)
  useEffect(() => {
    if (expenseData.categoryId) {
      fetchData();
    }
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

  // Render individual expense details or category expenses
  if (expenseData.expenseId) {
    // Individual expense detail view
    return (
      <SafeAreaView className="flex-1 bg-pink-900">
        <View className="flex-1 px-6">          
          <DetailRow 
            label="Description" 
            value={expenseData.description || 'No description'} 
            icon="description" 
          />
          
          <DetailRow 
            label="Amount" 
            value={`Rs ${parseFloat(expenseData.amount || 0).toFixed(2)}`} 
            icon="attach-money" 
          />
          
          <DetailRow 
            label="Category" 
            value={expenseData.categoryName || 'Unknown'} 
            icon="category" 
          />
          
          <DetailRow 
            label="Date & Time" 
            value={formatDate(expenseData.createdAt)} 
            icon="schedule" 
          />
          
          {expenseData.receiptImage && expenseData.receiptImage !== 'null' && (
            <ReceiptImage imageUri={expenseData.receiptImage} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Category expenses view (fallback)
  return (
    <SafeAreaView className="flex-1 bg-pink-900 justify-center">
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5C94C8" />
        </View>
      ) : (
        <ScrollView refreshControl={refreshControl}>
          <View className="flex-1 px-6 items-center">
            <CategoryHeader title={expenseData.title} />
            <ExpensesList expenses={expenses} formatDate={formatDate} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default React.memo(Details);
