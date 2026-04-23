import { SplashScreen, Stack } from "expo-router";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Linking } from "react-native";
import { router } from "expo-router";
import "../global.css";
import GlobalProvider from "../context/GlobalProvider";
import { AlertProvider } from "../context/AlertProvider";
import ErrorBoundary from "../components/ErrorBoundary";
import { supabase } from "../lib/supabase.js";

const RootLayout = () => {
  const [fontsLoaded, error] = useFonts({
    "Poppins-Black": require("../assets/fonts/Poppins-Black.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
    "Poppins-ExtraLight": require("../assets/fonts/Poppins-ExtraLight.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Thin": require("../assets/fonts/Poppins-Thin.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  // Deep link handler for password reset
  useEffect(() => {
    const handleUrl = async (url) => {
      if (!url) return;

      try {
        const parsed = new URL(url);
        const searchParams = parsed.searchParams;
        const hashParams = new URLSearchParams(parsed.hash.substring(1));

        // Check for error first
        const error = searchParams.get('error') || hashParams.get('error');
        const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');

        if (error) {
          router.push(`/reset-password?error=${error}&error_description=${errorDescription}`);
          return;
        }

        // Check for token (for password reset)
        const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');

        if (accessToken) {
          const params = new URLSearchParams();
          params.append('access_token', accessToken);
          if (refreshToken) {
            params.append('refresh_token', refreshToken);
          }
          router.push(`/reset-password?${params.toString()}`);
        }
      } catch (err) {
        console.error('Error handling deep link:', err);
      }
    };

    // Subscribe to future links
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    // Handle the case where the app was launched from a link
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleUrl(initialUrl);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <AlertProvider>
        <GlobalProvider>
          <StatusBar style="light" backgroundColor="#7C1F4E" />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: "#7C1F4E",
              },
              headerTintColor: "#fff",
              headerTitleStyle: {
                fontWeight: "bold",
                fontFamily: "Poppins-Bold",
                fontSize: 20,
              },
              headerShown: false,
            }}
          >
            <Stack.Screen
              name="(auth)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
                presentation: "containedModal",
              }}
            />
            <Stack.Screen
              name="reset-password"
              options={{
                headerShown: false,
                presentation: "modal",
              }}
            />
          </Stack>
        </GlobalProvider>
      </AlertProvider>
    </ErrorBoundary>
  );
};

export default RootLayout;
