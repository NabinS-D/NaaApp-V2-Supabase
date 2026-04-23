import { supabase, isSupabaseConfigured } from "../supabase";
import * as Linking from 'expo-linking';
import { OneSignal } from "react-native-onesignal";

// Helper function to check Supabase configuration
const checkSupabaseConfig = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please set up your Supabase project and environment variables.');
  }
  if (!supabase) {
    throw new Error('Supabase client not initialized. Please check your configuration.');
  }
};

export const createUser = async (email, password, username) => {
  try {
    checkSupabaseConfig();

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
        }
      }
    });

    if (authError) throw authError;

    // The user profile will be automatically created via database trigger
    return authData.user;
  } catch (error) {
    console.log("Signup Error", error);
    throw error;
  }
};

export const signInWithIdToken = async (idToken) => {
  try {
    checkSupabaseConfig();

    // Sign in with Google ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      return { data: null, error };
    }

    // Set up OneSignal for the authenticated user
    if (data.user) {
      OneSignal.login(data.user.id);
    }

    return { data, error: null };
  } catch (error) {
    console.log("Google Sign-In Error", error);
    return { data: null, error };
  }
};

export const signIn = async (email, password) => {
  try {
    checkSupabaseConfig();

    // Authenticate with Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw authError;

    // Verify session was created and persisted
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      throw new Error(sessionError?.message || 'Session not properly established after sign in');
    }

    // Handle OneSignal registration in the background (non-blocking)
    if (data?.user) {
      registerUserWithOneSignal(data.user).catch((error) => {
        console.error("Background OneSignal registration failed:", error);
      });
    }

    return data?.user;
  } catch (error) {
    throw new Error(error.message || 'Failed to sign in');
  }
};

// Separate function to handle OneSignal operations
const registerUserWithOneSignal = async (user) => {
  // Check if OneSignal is initialized
  if (!OneSignal.Notifications) {
    console.error("OneSignal is not initialized.");
    return;
  }

  try {
    const currentExternalId = await OneSignal.User.getExternalId();

    // Check if the user is already logged into OneSignal
    if (currentExternalId === user.id) {
      // User is already logged into OneSignal with the same ID
    } else {
      // Log the user into OneSignal
      OneSignal.login(user.id);
    }

    // Add the user's email to OneSignal
    OneSignal.User.addEmail(user.email);

    // Add additional tags for segmentation
    OneSignal.User.addTag("username", user.user_metadata?.username || user.email.split('@')[0]);
    OneSignal.User.addTag("accountCreated", user.created_at);
    OneSignal.User.addTag("userId", user.id);
  } catch (error) {
    console.error("OneSignal operations failed:", error);
  }
};

export const getCurrentUser = async () => {
  try {
    checkSupabaseConfig();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }

    if (!session) {
      throw new Error("No active session found. Please log in.");
    }

    // Get user profile data from database (includes updated avatar)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      // Fallback to auth user if profile not found
      return session.user;
    }

    // Get the latest user data from auth
    const { data: { user: authUser } } = await supabase.auth.getUser();

    // Merge auth user with database profile (database avatar takes priority)
    return {
      ...authUser,
      ...userProfile,
      // Ensure we're using the most up-to-date avatar URL
      avatar: userProfile.avatar || authUser.user_metadata?.avatar
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Uploads a new profile picture and updates user records
 * @param {object} userDoc - User document (unused, can be removed if not needed)
 * @param {object|string} pickerResult - Either an object with uri/fileName or a direct URI string
 * @returns {Promise<string>} Public URL of the uploaded avatar
 */
export const uploadUserProfilePicture = async (userDoc, pickerResult) => {
  try {
    checkSupabaseConfig();
    const { id: userId } = await getCurrentUser();

    // Process file info
    const isObject = typeof pickerResult === 'object' && pickerResult?.uri;
    const uri = isObject ? pickerResult.uri : pickerResult;
    const timestamp = Date.now();
    const ext = (isObject && pickerResult.fileName?.split('.').pop()) || 'jpg';
    const fileName = `${userId}/avatar_${timestamp}.${ext}`;

    // Read and validate file
    const FileSystem = require('expo-file-system');
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) throw new Error('File does not exist at the specified URI');

    // Upload file to storage
    const buffer = Uint8Array.from(
      atob(await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })),
      c => c.charCodeAt(0)
    );

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, { contentType: `image/${ext}`, cacheControl: '3600' });
    if (uploadError) throw uploadError;

    // Get public URL and update user records
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

    // Update auth and database in parallel
    const [authUpdate, dbUpdate] = await Promise.all([
      supabase.auth.updateUser({ data: { avatar: publicUrl } }),
      supabase
        .from('users')
        .update({ avatar: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single()
    ]);

    if (authUpdate.error) throw new Error(`Auth update failed: ${authUpdate.error.message}`);
    if (dbUpdate.error) throw new Error(`Database update failed: ${dbUpdate.error.message}`);

    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error.message);
    throw error;
  }
};

export const handleLogout = async () => {
  try {
    checkSupabaseConfig();

    // Sign out from Supabase
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.warn("Supabase sign out warning:", signOutError);
      // Continue with OneSignal cleanup even if Supabase sign out fails
    }

    // Remove user identification from OneSignal
    try {
      if (OneSignal?.logout) {
        await OneSignal.logout();
      }
      if (OneSignal?.User?.removeTag) {
        await OneSignal.User.removeTag("email");
      }
    } catch (oneSignalError) {
      console.warn("OneSignal cleanup warning:", oneSignalError);
      // Don't fail the logout process if OneSignal cleanup fails
    }

    return true;
  } catch (error) {
    console.error("Logout error:", error);
    // Return false instead of throwing to prevent showing error to user
    return false;
  }
};

export const handleUserChatData = async (userId) => {
  try {
    checkSupabaseConfig();

    const { data, error } = await supabase
      .from('ai_chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in handleUserChatData:", error);
    return [];
  }
};

export const changePassword = async (userpasswords) => {
  try {
    checkSupabaseConfig();

    const { error } = await supabase.auth.updateUser({
      password: userpasswords.new
    });

    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
};

export const sendPasswordResetEmail = async (email) => {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      checkSupabaseConfig();

      // Use Linking.createURL for proper deep linking
      const redirectTo = Linking.createURL('/', {
        scheme: 'mynaaapp',
      });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        // If it's a network/timeout error, retry
        if (error.message?.includes('504') || error.message?.includes('timeout') || error.status === 504) {
          lastError = error;

          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
        }
        throw error;
      }

      return true;
    } catch (error) {
      lastError = error;

      if ((error.message?.includes('504') || error.message?.includes('timeout') || error.status === 504) && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Password reset failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
};

export const updatePasswordWithToken = async (accessToken, newPassword, refreshToken) => {
  try {
    checkSupabaseConfig();

    // The token from the email link is an access_token, not a token_hash
    // We need to set the session using the access_token and refresh_token
    const sessionData = {
      access_token: accessToken,
    };
    if (refreshToken) {
      sessionData.refresh_token = refreshToken;
    }
    const { data, error } = await supabase.auth.setSession(sessionData);

    if (error) throw error;

    // Now update the password with the established session
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) throw updateError;

    // Sign out after password reset to force fresh login
    await supabase.auth.signOut();

    return updateData;
  } catch (error) {
    throw error;
  }
};
