import React, { useState, useCallback, memo, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobalContext } from "../../context/GlobalProvider";
import { router } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import CustomModal from "../../components/CustomModal";
import {
  changePassword,
  handleLogout,
  uploadUserProfilePicture,
} from "../../lib/APIs/UserApiSupabase";
import FormFields from "../../components/FormFields";
import useAlertContext from "../../context/AlertProvider";

const HeaderButtons = memo(({ handlePasswordChange }) => (
  <View style={styles.headerButtonsContainer}>
    <TouchableOpacity onPress={handlePasswordChange} style={styles.modernButton}>
      <LinearGradient
        colors={['#10B981', '#059669']}
        style={styles.gradientButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Ionicons name="key-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Change Password</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
));
// Memoized components for better performance
const ProfileImage = memo(({ uri, isUploading, onPress }) => {
  return (
    <View style={styles.profileSection}>
      <TouchableOpacity onPress={onPress} disabled={isUploading}>
        <View style={styles.profileImageContainer}>
          <LinearGradient
            colors={['#F59E0B', '#EF4444', '#8B5CF6']}
            style={styles.profileImageGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileImageInner}>
              <Image
                style={styles.profileImage}
                source={{ uri }}
                resizeMode="cover"
              />
            </View>
          </LinearGradient>
          {isUploading ? (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
            <View style={styles.uploadOverlay}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.cameraButtonGradient}
              >
                <Ionicons name="camera" size={24} color="#fff" />
              </LinearGradient>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
});

const UserDetails = memo(
  ({ username, email, userId, emailVerification }) => (
    <View style={styles.detailsCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
        style={styles.detailsGradient}
      >
        <View style={styles.usernameContainer}>
          <Text style={styles.username}>{username || "User"}</Text>
          <View>
            <Ionicons
              name={emailVerification ? "checkmark-circle" : "close-circle"}
              size={22}
              color={emailVerification ? "#10B981" : "#EF4444"}
            />
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Ionicons name="mail-outline" size={18} color="#E5E7EB" />
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{email}</Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="finger-print-outline" size={18} color="#E5E7EB" />
            <Text style={styles.detailLabel}>User ID</Text>
            <Text style={styles.detailValue}>{userId?.slice(0, 18)}...</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  )
);

const ImagePreview = memo(({ uri, onClose }) => (
  <View style={styles.previewOverlay}>
    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
      <Ionicons name="close" size={30} color="#fff" />
    </TouchableOpacity>
    <Image source={{ uri }} style={styles.previewImage} resizeMode="contain" />
  </View>
));

const ModalOptions = memo(({ onOptionPress }) => (
  <>
    {["Upload from Gallery", "Open Camera", "View profile picture"].map(
      (item, index) => (
        <Pressable
          key={index}
          style={styles.optionButton}
          onPress={() => onOptionPress(item)}
        >
          <Text style={styles.optionText}>{item}</Text>
        </Pressable>
      )
    )}
  </>
));

export default function Profile() {
  const { user, userdetails, checkAuth, setuserdetails, setUser, setIsLoggedIn } = useGlobalContext();
  const { showAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [passwordChangeModalVisible, setPasswordChangeModalVisible] =
    useState(false);
  const [userPasswords, setuserPasswords] = useState({ old: "", new: "" });
  const [passwordChangeIsLoading, setPasswordChangeIsLoading] = useState(false);
  const [localAvatar, setLocalAvatar] = useState(userdetails?.avatar);
  // console.log(userdetails.user_metadata.email_verified);
  useEffect(() => {
    if (userdetails?.avatar) {
      setLocalAvatar(userdetails.avatar);
    }
  }, [userdetails?.avatar]);

  // Loading state check
  if (!user || !userdetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: "center" }]}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  // Memoized handlers
  const handleLogoutAction = useCallback(async () => {
    setIsLoading(true);
    try {
      await handleLogout();
      // Clear the global state immediately to ensure proper logout
      setUser(null);
      setuserdetails(null);
      setIsLoggedIn(false);
      // Navigate to signin page
      router.replace("/signin");
    } catch (error) {
      showAlert(
        "Logout Error",
        `Unable to log out: ${error.message}`,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [showAlert, setUser, setuserdetails, setIsLoggedIn]);

  const toggleModal = useCallback(() => {
    setModalVisible((prev) => !prev);
  }, []);

  const togglePasswordChangeModal = useCallback(() => {
    setPasswordChangeModalVisible((prev) => !prev);
  }, []);

  const handleProfilePictureUpload = useCallback(
    async (result) => {
      setIsUploading(true);
      try {
        const fileUrl = await uploadUserProfilePicture(userdetails, result);
        // Then update global state
        setuserdetails((prev) => ({
          ...prev,
          avatar: fileUrl,
        }));
        // Update local avatar state first
        setLocalAvatar(fileUrl);
        showAlert("Success", "Profile picture uploaded successfully!");
        setIsUploading(false);
        await checkAuth(false);
      } catch (error) {
        showAlert(
          "Error",
          `Failed to upload profile picture: ${error.message}`,
          "error"
        );
      } finally {
        setIsUploading(false);
        setModalVisible(false); // Close modal after upload
      }
    },
    [userdetails, setuserdetails]
  );

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "Permissions needed",
        "Sorry, we need camera roll permissions to make this work!",
        "error"
      );

      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        await handleProfilePictureUpload(result.assets[0]);
      }
    } catch (error) {
      showAlert("Error", "Failed to pick image", "error");
    }
  }, [handleProfilePictureUpload]);

  const handleOptionPress = useCallback(
    (option) => {
      toggleModal();

      switch (option) {
        case "Upload from Gallery":
          pickImage();
          break;
        case "Open Camera":
          handleOpenCamera();
          break;
        case "View profile picture":
          setShowImagePreview(true);
          break;
      }
    },
    [pickImage, toggleModal]
  );

  const handleOpenCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status === "granted") {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });

        if (!result.canceled) {
          await handleProfilePictureUpload(result.assets[0]);
        }
      }
    } catch (err) {
      showAlert("Error", "Failed to access camera", "error");
    }
  }, [handleOpenCamera]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAuth(false); // Pass false to prevent redirect on refresh
    setRefreshing(false);
  }, [checkAuth]);

  // Memoized styles that depend on props
  const containerStyle = useMemo(
    () => [styles.container, showImagePreview && styles.blurBackground],
    [showImagePreview]
  );

  const handlePasswordChange = useCallback(async () => {
    setPasswordChangeIsLoading(true);
    try {
      await changePassword(userPasswords, userdetails.id);
      showAlert("Success", "Password changed successfully!");
    } catch (error) {
      showAlert(
        "Error",
        `Failed to change password: ${error.message}`,
        "error"
      );
    } finally {
      setIsLoading(false);
      setPasswordChangeModalVisible(false);
      setPasswordChangeIsLoading(false);
    }
  }, [userPasswords, userdetails]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 mt-5">
        <Text className="text-2xl text-cyan-100 font-pbold text-center">
          Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#999999"
            titleColor="#999999"
          />
        }
      >
        <View style={containerStyle}>
          {showImagePreview && (
            <ImagePreview
              uri={localAvatar}
              onClose={() => setShowImagePreview(false)}
            />
          )}

          <ProfileImage
            uri={localAvatar}
            isUploading={isUploading}
            onPress={toggleModal}
          />

          <UserDetails
            username={userdetails?.username}
            email={userdetails?.email}
            userId={user?.id}
            emailVerification={userdetails?.user_metadata?.email_verified}
          />

          <View style={styles.actionsContainer}>
            <TouchableOpacity onPress={handleLogoutAction} style={styles.logoutButton} disabled={isLoading}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.logoutGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Logout</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <HeaderButtons
              handlePasswordChange={() => setPasswordChangeModalVisible(true)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Use Absolute Positioning */}
      {passwordChangeModalVisible && (
        <View style={styles.previewOverlay}>
          <CustomModal
            title="Change password"
            modalVisible={passwordChangeModalVisible}
            onSecondaryPress={togglePasswordChangeModal}
            onPrimaryPress={handlePasswordChange}
          >
            <View className="w-full">
              <FormFields
                placeholder="Enter old password"
                value={userPasswords.old}
                inputfieldcolor="bg-gray-200" // Light gray background
                textcolor="text-gray-800" // Darker text
                bordercolor="border-gray-400" // Gray border
                handleChangeText={(text) =>
                  setuserPasswords({ ...userPasswords, old: text })
                }
                otherStyles="mb-4"
              />
              <FormFields
                placeholder="Enter new password"
                value={userPasswords.new}
                inputfieldcolor="bg-gray-200" // Light gray background
                textcolor="text-gray-800" // Darker text
                bordercolor="border-gray-400" // Gray border
                handleChangeText={(text) =>
                  setuserPasswords({ ...userPasswords, new: text })
                }
                otherStyles="mb-4"
              />
            </View>
          </CustomModal>
        </View>
      )}

      {modalVisible && (
        <View style={styles.previewOverlay}>
          <CustomModal
            title="Select an Action"
            modalVisible={modalVisible}
            onSecondaryPress={toggleModal}
            onPrimaryPress={toggleModal}
          >
            <ModalOptions onOptionPress={handleOptionPress} />
          </CustomModal>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#7C1F4E",
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    alignItems: "center",
  },
  // Profile Section Styles
  profileSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 20,
  },
  profileImageGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  profileImageInner: {
    width: "100%",
    height: "100%",
    borderRadius: 66,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  uploadOverlay: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  cameraButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  // User Details Card Styles
  detailsCard: {
    width: "100%",
    marginBottom: 30,
    borderRadius: 20,
    overflow: "hidden",
  },
  detailsGradient: {
    padding: 24,
    borderRadius: 20,
  },
  usernameContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  username: {
    fontFamily: "Poppins-Bold",
    fontSize: 28,
    color: "#fff",
    textAlign: "center",
    marginRight: 10,
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#8B5CF6",
  },
  detailLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: "#E5E7EB",
    marginLeft: 12,
    flex: 1,
  },
  detailValue: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#fff",
    flex: 2,
    textAlign: "right",
  },
  // Actions Container Styles
  actionsContainer: {
    width: "100%",
    gap: 16,
  },
  headerButtonsContainer: {
    width: "100%",
  },
  modernButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  logoutButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
  // Modal Styles
  optionButton: {
    padding: 16,
    backgroundColor: "#f8f9fa",
    marginVertical: 6,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: {
    color: "#374151",
    fontFamily: "Poppins-Medium",
    fontSize: 16,
  },
  previewOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "90%",
    height: "70%",
    borderRadius: 12,
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 1001,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
});
