import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  View,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Link, Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../constants";
import CustomButton from "../components/CustomButton";
import GoogleAuth from "../components/GoogleAuth";
import { useGlobalContext } from "../context/GlobalProvider";
import React, { useEffect, useState, useCallback } from "react";
import * as Updates from "expo-updates";
import useAlertContext from "../context/AlertProvider";
import NetInfo from "@react-native-community/netinfo";
import { OneSignal } from "react-native-onesignal";

export default function App() {
  const [isChecking, setIsChecking] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const { isLoggedIn, isLoading, userdetails, checkAuth } = useGlobalContext();
  const { showAlert } = useAlertContext();

  // OneSignal Initialization - Run once when component mounts
  useEffect(() => {
    if (Platform.OS === "web") return;

    const initializeOneSignal = async () => {
      try {
        const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
        if (!appId) {
          console.warn("OneSignal App ID is missing");
          return;
        }

        // Initialize OneSignal
        OneSignal.initialize(appId);

        // Request notification permission
        await OneSignal.Notifications.requestPermission(true);

        // Set up user ID if logged in
        if (userdetails?.accountId) {
          OneSignal.login(userdetails.accountId);
        }

        console.log("OneSignal initialized successfully");
      } catch (error) {
        console.warn("OneSignal initialization warning:", error);
      }
    };

    initializeOneSignal();
  }, []);

  // Update OneSignal user ID when user logs in
  useEffect(() => {
    if (isLoggedIn && userdetails?.accountId) {
      try {
        OneSignal?.login?.(userdetails.accountId);
      } catch (error) {
        console.warn("Failed to update OneSignal user ID:", error);
      }
    }
  }, [isLoggedIn, userdetails?.accountId]);

  // Update handling
  const handleUpdate = useCallback(async () => {
    try {
      setIsChecking(true);
      const update = await Updates.fetchUpdateAsync();

      if (update.isNew) {
        showAlert("Update Ready", "Restart app to apply changes", "info");
        setTimeout(() => Updates.reloadAsync(), 3000);
      }
    } catch (error) {
      showAlert(
        "Update Failed",
        error instanceof Error ? error.message : "An unknown error occurred",
        "error"
      );
    } finally {
      setIsChecking(false);
    }
  }, []);

  const checkForUpdates = useCallback(
    async (manualCheck = false) => {
      if (__DEV__) return;

      try {
        setIsChecking(true);
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          showAlert(
            "Update Available",
            manualCheck ? "Download will start automatically" : "A new version is available",
            "info"
          );
          setTimeout(() => downloadUpdate(), 2000);
        } else if (manualCheck) {
          showAlert("You're up to date!", "No updates available", "success");
        }
      } catch (error) {
        if (manualCheck) {
          showAlert(
            "Check Failed",
            error instanceof Error ? error.message : "An unknown error occurred",
            "error"
          );
        }
      } finally {
        setIsChecking(false);
      }
    },
    [handleUpdate]
  );

  // Check for updates on mount
  useEffect(() => {
    checkForUpdates();

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        checkForUpdates();
      }
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, [checkForUpdates]);

  // Loading state
  if (isLoading || isChecking) {
    return (
      <SafeAreaView style={{ backgroundColor: "#7C1F4E", height: "100%" }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5C94C8" />
          {isChecking && (
            <>
              <Text className="text-white mt-2">
                {updateProgress > 0
                  ? "Downloading update..."
                  : "Checking for updates..."}
              </Text>
              {updateProgress > 0 && (
                <Text className="text-white mt-1">{updateProgress}%</Text>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Redirect if logged in
  if (isLoggedIn) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Main UI
  return (
    <SafeAreaView className="bg-[#7C1F4E] h-full">
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="w-full items-center px-4 my-6">
          <View className="mb-4">
            <Image
              source={images.NaaApp}
              className="w-[150px] h-[100px]"
              resizeMode="contain"
            />
          </View>

          <View className="w-full items-center">
            <Image
              source={images.landingimage}
              className="w-[380px] h-[280px]"
              resizeMode="contain"
            />
          </View>

          <View className="relative mt-5">
            <Text className="text-3xl text-white font-psemibold text-center">
              Believe and you shall achieve it. Unlock your full potential with{' '}
              <Text className="text-secondary-200">NaaApp</Text>
            </Text>
            <Image
              source={images.path}
              className="w-[136px] h-[15px] absolute -bottom-2 right-1/2 translate-x-20"
              resizeMode="contain"
            />
          </View>

          <Text className="text-sm font-pregular text-gray-100 mt-7 text-center">
            It's never too late to start your journey.
          </Text>

          <View className="justify-center items-center mt-6 mb-6">
            <GoogleAuth
              onSuccess={async () => {
                await checkAuth();
                router.replace("/(tabs)/home");
              }}
              onError={(error) => {
                showAlert("Google Sign-In Error", error.message, "error");
              }}
            />
          </View>

          <CustomButton
            title="Sign in with Email"
            handlePress={() => router.push("/(auth)/signin")}
            containerStyles="w-full mb-4"
            buttoncolor="bg-blue-600"
            textStyles="text-white"
            fullWidth
          />

          <CustomButton
            title="Check for Updates"
            handlePress={() => checkForUpdates(true)}
            containerStyles="w-full"
            isLoading={isChecking}
            buttoncolor="bg-green-500"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
