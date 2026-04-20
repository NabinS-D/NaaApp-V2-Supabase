import React from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AIChat from "../../components/AI";
import { View } from "react-native";
import { useGlobalContext } from "../../context/GlobalProvider.js";

const Home = () => {
  const { userdetails} = useGlobalContext();
  return (
    <SafeAreaView style={styles.safeArea}>
     <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 mt-5">
            <Text className="text-2xl text-cyan-100 font-pbold text-center">
              Welcome {userdetails?.username}!
            </Text>
          </View>
      <AIChat />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#7C1F4E",
  },
});

export default Home;
