import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { updatePasswordWithToken } from '../lib/APIs/UserApiSupabase';
import CustomModal from '../components/CustomModal';
import FormFields from '../components/FormFields';
import { supabase } from '../lib/supabase';
import useAlertContext from '../context/AlertProvider';

export default function ResetPassword() {
    const params = useLocalSearchParams();
    const { token, error, error_description } = params;
    const { showAlert } = useAlertContext();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [tokenError, setTokenError] = useState(null);
    const [modalVisible, setModalVisible] = useState(true);

    useEffect(() => {
        // Check if there's an error from the deep link first
        if (error) {
            const errorMsg = error_description ? decodeURIComponent(error_description) : 'Reset link error';
            setTokenError(errorMsg);
            return;
        }

        // If no token, redirect back to signin
        if (!token) {
            router.replace('/(auth)/signin');
            return;
        }

        // Validate the token silently when component mounts
        validateToken();
    }, [token, error, error_description]);

    const validateToken = async () => {
        try {
            // Try to verify the OTP token silently
            const { data, error } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'recovery'
            });

            if (error) {
                console.log('Token validation error:', error);
                if (error.message.includes('expired') || error.message.includes('invalid')) {
                    setTokenError('This password reset link has expired or is invalid. Please request a new one.');
                } else {
                    setTokenError(`Token validation failed: ${error.message}`);
                }
            } else {
                console.log('Token validated successfully');
                setTokenError(null);
            }
        } catch (error) {
            console.log('Token validation exception:', error);
            setTokenError('Unable to validate reset link. Please try again.');
        }
    };

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
            await updatePasswordWithToken(token, newPassword);
            showAlert('Success', 'Your password has been reset successfully!', 'success');
            setTimeout(() => {
                router.replace('/(auth)/signin');
            }, 2000);
        } catch (error) {
            console.log("Reset error", error)
            showAlert('Error', `Failed to reset password: ${error.message}`, 'error');
        } finally {
            setIsResettingPassword(false);
        }
    };

    const handleCancel = () => {
        setModalVisible(false);
    };

    const handleBackToSignin = () => {
        router.replace('/(auth)/signin');
    };

    // Show error state if token is invalid/expired
    if (tokenError) {
        return (
            <SafeAreaView className="bg-[#7C1F4E] h-full">
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <CustomModal
                        title="Reset Link Invalid"
                        modalVisible={modalVisible}
                        onPrimaryPress={handleBackToSignin}
                        primaryButtonText="Back to Sign In"
                    >
                        <View className="w-full">
                            <Text className="text-red-600 text-sm mb-4 text-center">
                                {tokenError}
                            </Text>
                            <Text className="text-gray-600 text-xs text-center">
                                Please go back to the sign-in page and request a new password reset link.
                            </Text>
                        </View>
                    </CustomModal>
                </View>
            </SafeAreaView>
        );
    }

    // Show password reset form if token is valid
    return (
        <SafeAreaView className="bg-[#7C1F4E] h-full">
            <View style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <CustomModal
                    title="Reset Your Password"
                    modalVisible={modalVisible}
                    onSecondaryPress={handleCancel}
                    onPrimaryPress={handlePasswordReset}
                    primaryButtonText="Reset Password"
                    secondaryButtonText="Cancel"
                    isLoading={isResettingPassword}
                >
                    <View className="w-full">
                        <Text className="text-gray-600 text-sm mb-4 text-center">
                            Enter your new password below.
                        </Text>
                        <FormFields
                            placeholder="New password"
                            value={newPassword}
                            inputfieldcolor="bg-gray-200"
                            textcolor="text-gray-800"
                            bordercolor="border-gray-400"
                            handleChangeText={setNewPassword}
                            secureTextEntry={true}
                            otherStyles="mb-4"
                        />
                        <FormFields
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            inputfieldcolor="bg-gray-200"
                            textcolor="text-gray-800"
                            bordercolor="border-gray-400"
                            handleChangeText={setConfirmPassword}
                            secureTextEntry={true}
                            otherStyles="mb-4"
                        />
                    </View>
                </CustomModal>
            </View>
        </SafeAreaView>
    );
}
