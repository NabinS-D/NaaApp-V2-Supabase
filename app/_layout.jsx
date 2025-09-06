import { SplashScreen, Stack } from "expo-router";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Linking } from "react-native";
import { router } from "expo-router";
import "../global.css";
import GlobalProvider from "../context/GlobalProvider";
import { AlertProvider } from "../context/AlertProvider";

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
    const handleUrl = async (event) => {
      const { url } = event;
      console.log('Deep link received:', url);
      try {
        const parsed = new URL(url);
        console.log('Parsed URL - pathname:', parsed.pathname, 'search:', parsed.search, 'hash:', parsed.hash);
        console.log('Full parsed object:', { pathname: parsed.pathname, search: parsed.search, hash: parsed.hash, host: parsed.host });

        // Handle custom scheme URLs - check both pathname and host
        if (parsed.pathname === '/reset-password' || parsed.host === 'reset-password') {
          // Parse both query parameters and hash fragments
          const searchParams = parsed.searchParams;
          const hashParams = new URLSearchParams(parsed.hash.substring(1)); // Remove the # symbol
          
          // Check for errors first (in both locations)
          const error = searchParams.get('error') || hashParams.get('error');
          const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
          
          if (error) {
            console.log('Deep link error:', error, errorDescription);
            // Navigate to reset-password with error parameters so it can show the error modal
            router.push(`/reset-password?error=${error}&error_description=${errorDescription}`);
            return;
          }

          // Check for tokens in both locations
          const token = searchParams.get('access_token') || hashParams.get('access_token') || 
                       searchParams.get('token') || hashParams.get('token') ||
                       searchParams.get('refresh_token') || hashParams.get('refresh_token');
          console.log('Token found:', token ? 'Yes' : 'No');
          console.log('Token value (first 50 chars):', token ? token.substring(0, 50) + '...' : 'None');

          if (token) {
            console.log('Navigating to reset-password with token...');
            // Navigate to the reset-password route with the token
            router.push(`/reset-password?token=${token}`);
            console.log('Navigation command sent');
          } else {
            console.log('No token found, not navigating');
          }
        }
      } catch (error) {
        console.error('Error parsing deep link:', error);
      }
    };

    // Subscribe to future links
    const subscription = Linking.addEventListener('url', handleUrl);

    // Handle the case where the app was launched from a link
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleUrl({ url: initialUrl });
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
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
  );
};

export default RootLayout;
