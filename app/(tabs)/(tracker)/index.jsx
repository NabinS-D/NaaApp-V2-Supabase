import { Text, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import ExpenseTracker from "../../../components/Expense";
import Forecasting from "../../../components/Forecasting";

const Tracker = () => {
  return (
    <SafeAreaView className="flex-1 bg-pink-900">
      {/* Header */}
      <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 mt-5 mb-2">
        <Text className="text-2xl text-cyan-100 font-pbold text-center">
          Tracker
        </Text>
      </View>
      {/* Main Content */}
      <Forecasting />
      <ExpenseTracker />
    </SafeAreaView>
  );
};

export default Tracker;
