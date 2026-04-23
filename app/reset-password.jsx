import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { updatePasswordWithToken } from "../lib/APIs/UserApiSupabase.js";
import useAlertContext from "../context/AlertProvider";
import FormFields from "../components/FormFields";
import CustomButton from "../components/CustomButton";

export default function ResetPassword() {
  const params = useLocalSearchParams();
  const { access_token, refresh_token, error, error_description } = params;
  const { showAlert } = useAlertContext();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  useEffect(() => {
    // Check if there's an error from the deep link first
    if (error) {
      const errorMsg = error_description ? decodeURIComponent(error_description) : 'Reset link error';
      setTokenError(errorMsg);
      return;
    }

    // If no access_token, redirect back to signin
    if (!access_token) {
      router.replace('/(auth)/signin');
      return;
    }
  }, [access_token, refresh_token, error, error_description]);

  const handlePasswordReset = async () => {
    if (!newPassword.trim()) {
      showAlert('Error', 'Password cannot be empty', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Error', 'Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters', 'error');
      return;
    }

    setIsResettingPassword(true);
    try {
      await updatePasswordWithToken(access_token, newPassword, refresh_token);
      showAlert('Success', 'Your password has been reset successfully!', 'success');
      setTimeout(() => {
        router.replace('/(auth)/signin');
      }, 2000);
    } catch (error) {
      showAlert('Error', `Failed to reset password: ${error.message}`, 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <ScrollView className="bg-primary h-full">
      <View className="w-full justify-center min-h-[85vh] px-4 my-6">
        <Text className="text-2xl text-white font-psemibold text-center mb-2">
          Reset Password
        </Text>
        <Text className="text-gray-100 font-pregular text-center mb-8">
          Enter your new password below
        </Text>

        {tokenError && (
          <View className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
            <Text className="text-red-500 font-psemibold text-center">
              {tokenError}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/signin')}
              className="mt-4"
            >
              <Text className="text-white font-pregular text-center underline">
                Go back to sign in
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!tokenError && (
          <>
            <FormFields
              title="New Password"
              value={newPassword}
              handleChangeText={setNewPassword}
              otherStyles="mt-7"
              placeholder="Enter new password"
              secureTextEntry
            />

            <FormFields
              title="Confirm Password"
              value={confirmPassword}
              handleChangeText={setConfirmPassword}
              otherStyles="mt-7"
              placeholder="Confirm new password"
              secureTextEntry
            />

            <CustomButton
              title="Reset Password"
              handlePress={handlePasswordReset}
              containerStyles="mt-7"
              isLoading={isResettingPassword}
            />

            <View className="justify-center pt-5 flex-row gap-2">
              <Text className="text-lg text-gray-100 font-pregular">
                Remember your password?
              </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/signin')}>
                <Text className="text-lg font-psemibold text-secondary">
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
