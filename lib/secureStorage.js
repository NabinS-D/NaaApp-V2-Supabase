import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const USER_EMAIL_KEY = 'user_email';
const USER_PASSWORD_KEY = 'user_password';

export default {
  /**
   * Save user credentials securely
   * @param {string} email - User email
   * @param {string} password - User password
   */
  async saveCredentials(email, password) {
    try {
      await SecureStore.setItemAsync(USER_EMAIL_KEY, email);
      await SecureStore.setItemAsync(USER_PASSWORD_KEY, password);
      return true;
    } catch (error) {
      console.error('Error saving credentials:', error);
      return false;
    }
  },

  /**
   * Get saved user credentials
   * @returns {Object} Object with email and password, or null if not found
   */
  async getCredentials() {
    try {
      const email = await SecureStore.getItemAsync(USER_EMAIL_KEY);
      const password = await SecureStore.getItemAsync(USER_PASSWORD_KEY);
      
      if (email && password) {
        return { email, password };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting credentials:', error);
      return null;
    }
  },

  /**
   * Clear saved user credentials
   */
  async clearCredentials() {
    try {
      await SecureStore.deleteItemAsync(USER_EMAIL_KEY);
      await SecureStore.deleteItemAsync(USER_PASSWORD_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing credentials:', error);
      return false;
    }
  },

  /**
   * Set biometric authentication as enabled
   */
  async setBiometricEnabled(enabled) {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled.toString());
      return true;
    } catch (error) {
      console.error('Error setting biometric enabled:', error);
      return false;
    }
  },

  /**
   * Check if biometric authentication is enabled
   */
  async getBiometricEnabled() {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error getting biometric enabled:', error);
      return false;
    }
  },
};
