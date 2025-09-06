import { Stack } from "expo-router";
import React from "react";

const TrackerLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#7C1F4E",
        },
        headerTintColor: "#fff",
          headerTitleStyle: {
            fontFamily: "Poppins-Bold",
            fontSize: 20,
            color: "#fff", // This ensures the text is white
          },
        headerShown: false, // Hide header by default
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // Explicitly hide header for tracker screen
        }} 
      />
      <Stack.Screen
        name="details"
        options={{
          headerTitle: "Expense Details",
          headerShown: true,     // Explicitly show header for details
        }}
      />
       <Stack.Screen
        name="categoryList"
        options={{
          headerTitle: "Categories",
          headerShown: true,     // Explicitly show header for details
        }}
      />
    </Stack>
  );
};

export default TrackerLayout;
