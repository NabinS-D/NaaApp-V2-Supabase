import * as LocalAuthentication from 'expo-local-authentication';

export const BiometricAuth = {
  /**
   * Check if biometric authentication is available on the device
   */
  async isAvailable() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  },

  /**
   * Get the type of biometric authentication available
   */
  async getBiometricType() {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Iris';
      }
      
      return 'Biometric';
    } catch (error) {
      console.error('Error getting biometric type:', error);
      return 'Biometric';
    }
  },

  /**
   * Authenticate using biometrics
   * @param {string} promptMessage - Message to show during authentication
   */
  async authenticate(promptMessage = 'Authenticate to sign in') {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  },

  /**
   * Check if biometric authentication is enabled for the user
   */
  async isEnabled() {
    const SecureStorage = require('./secureStorage').default;
    return await SecureStorage.getBiometricEnabled();
  },

  /**
   * Enable biometric authentication for the user
   */
  async enable() {
    const SecureStorage = require('./secureStorage').default;
    await SecureStorage.setBiometricEnabled(true);
  },

  /**
   * Disable biometric authentication for the user
   */
  async disable() {
    const SecureStorage = require('./secureStorage').default;
    await SecureStorage.setBiometricEnabled(false);
    await SecureStorage.clearCredentials();
  },
};
