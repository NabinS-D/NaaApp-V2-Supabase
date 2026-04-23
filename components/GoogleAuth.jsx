import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, View, Modal, ActivityIndicator } from 'react-native';
import { GoogleSignin, GoogleSigninButton, statusCodes } from '@react-native-google-signin/google-signin';
import { signInWithIdToken } from '../lib/APIs/UserApiSupabase';
import { supabase } from '../lib/supabase';
import useAlertContext from '../context/AlertProvider';

const GoogleAuth = ({ onSuccess, onError }) => {
    const { showAlert } = useAlertContext();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            offlineAccess: true,
            scopes: ['profile', 'email'],
        });
    }, []);

    const signInWithGoogle = async () => {
        setIsLoading(true);
        try {
            await GoogleSignin.hasPlayServices();

            // Always sign out first to force account selection
            try {
                await GoogleSignin.signOut();
            } catch (error) {
                // Ignore if already signed out
            }

            const userInfo = await GoogleSignin.signIn();

            if (userInfo.data && userInfo.data.idToken) {
                const result = await signInWithIdToken(userInfo.data.idToken);

                if (result.error) {
                    console.error('Supabase Auth Error:', result.error);
                    showAlert('Authentication Error', result.error.message, 'error');
                    onError?.(result.error);
                } else {
                    onSuccess?.(result.data);
                }
            }
        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                showAlert('Sign-In Cancelled', 'Google sign-in was cancelled', 'warning');
            } else if (error.code === statusCodes.IN_PROGRESS) {
                showAlert('Sign-In In Progress', 'Google sign-in is already in progress', 'warning');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                showAlert('Play Services Error', 'Google Play Services not available or outdated', 'error');
            } else {
                showAlert('Error', 'Failed to sign in with Google', 'error');
            }

            onError?.(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View>
            <GoogleSigninButton
                size={GoogleSigninButton.Size.Wide}
                color={GoogleSigninButton.Color.Dark}
                onPress={signInWithGoogle}
                style={{ marginTop: 16 }}
                disabled={isLoading}
            />

            <Modal
                transparent={true}
                visible={isLoading}
                animationType="fade"
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <View style={{
                        backgroundColor: '#fff',
                        padding: 30,
                        borderRadius: 15,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 10,
                        minWidth: 200
                    }}>
                        <ActivityIndicator size="large" color="#4285F4" />
                        <Text style={{
                            marginTop: 15,
                            fontSize: 16,
                            fontWeight: '500',
                            color: '#333',
                            textAlign: 'center'
                        }}>
                            Signing in with Google...
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default GoogleAuth;