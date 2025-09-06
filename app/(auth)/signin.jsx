import { Image, Text, View, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { images } from "../../constants";
import FormFields from "../../components/FormFields";
import CustomButton from "../../components/CustomButton";
import CustomModal from "../../components/CustomModal";
import { Link, router } from "expo-router";
import { signIn, sendPasswordResetEmail } from "../../lib/APIs/UserApiSupabase.js";
import { useGlobalContext } from "../../context/GlobalProvider.js";
import useAlertContext from "../../context/AlertProvider";
import GoogleAuth from "../../components/GoogleAuth";

const SignIn = () => {
  const { checkAuth } = useGlobalContext();
  const { showAlert } = useAlertContext();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [isSubmitting, setisSubmitting] = useState(false);
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const submit = async ({ email, password }) => {
    if (email === "") {
      showAlert("Error", "Email cannot be empty!", "error");
      return;
    }
    if (password === "") {
      showAlert("Error", "Password cannot be empty!", "error");
      return;
    }

    setisSubmitting(true);

    try {
      await signIn(email, password);
      await checkAuth(); // Wait for context to update
      router.replace("/(tabs)/dashboard");
    } catch (error) {
      showAlert(
        "SignIn Error",
        `Something went wrong! ${error.message}`,
        "error"
      );
    } finally {
      setisSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      showAlert("Error", "Please enter your email address", "error");
      return;
    }

    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(forgotPasswordEmail);
      showAlert(
        "Password Reset Sent", 
        "Check your email for password reset instructions", 
        "success"
      );
      setForgotPasswordModalVisible(false);
      setForgotPasswordEmail("");
    } catch (error) {
      console.log("Reset Error", error);
      showAlert(
        "Reset Error", 
        `Failed to send reset email: ${error.message}`, 
        "error"
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <SafeAreaView className="bg-[#7C1F4E] h-full">
      <ScrollView>
        <View className="w-full flex justify-center min-h-[85vh] px-4 my-6">
          {/* Logo Image */}
          <Image
            source={images.NaaApp}
            resizeMode="contain"
            className="w-[60px] h-[60px] max-w-full max-h-full mx-auto"
          />

          {/* Text below Image */}
          <Text className="text-white text-3xl font-semibold mt-8 font-psemibold text-center">
            Log in to NaaApp
          </Text>
          <FormFields
            title="Email"
            value={form.email}
            handleChangeText={(text) => setForm({ ...form, email: text })}
            otherStyles="mt-7"
            keyboardType="email-address"
            placeholder="Enter your email"
            textcolor="text-white"
            titlecolor="text-gray-100"
          />

          <FormFields
            title="Password"
            value={form.password}
            handleChangeText={(text) => setForm({ ...form, password: text })}
            otherStyles="mt-7"
            placeholder="Enter your password"
            textcolor="text-white"
            titlecolor="text-gray-100"
          />
          <CustomButton
            title="Sign-In"
            containerStyles="mt-6 mb-4"
            handlePress={() => submit(form)}
            isLoading={isSubmitting}
            fullWidth={true}
          />

          <TouchableOpacity 
            onPress={() => {
              setForgotPasswordEmail(form.email);
              setForgotPasswordModalVisible(true);
            }}
            className="mb-6"
          >
            <Text className="text-blue-400 font-psemibold text-sm text-center">
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <View className="justify-center items-center mb-6">
            <GoogleAuth
              onSuccess={async () => {
                await checkAuth();
                router.replace("/(tabs)/dashboard");
              }}
              onError={(error) => {
                showAlert("Google Sign-In Error", error.message, "error");
              }}
            />
          </View>

          <View className="justify-center flex-row gap-2 mb-4">
            <Text className=" text-gray-100 font-psemibold text-base text-center">
              Don't have an account?{" "}
              <Link
                className="text-secondary-200 font-psemibold"
                href="/(auth)/signup"
              >
                Sign Up
              </Link>
            </Text>
          </View>

          <View className="justify-center flex-row">
            <Link
              href="/"
              className="text-blue-400 font-psemibold text-base"
            >
              Go to Homescreen
            </Link>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      {forgotPasswordModalVisible && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <CustomModal
            title="Reset Password"
            modalVisible={forgotPasswordModalVisible}
            onSecondaryPress={() => {
              setForgotPasswordModalVisible(false);
              setForgotPasswordEmail("");
            }}
            onPrimaryPress={handleForgotPassword}
            primaryButtonText="Send Reset Email"
            secondaryButtonText="Cancel"
            isLoading={isResettingPassword}
          >
            <View className="w-full">
              <Text className="text-gray-600 text-sm mb-4 text-center">
                Enter your email address and we'll send you a link to reset your password.
              </Text>
              <FormFields
                placeholder="Enter your email"
                value={forgotPasswordEmail}
                inputfieldcolor="bg-gray-200"
                textcolor="text-gray-800"
                bordercolor="border-gray-400"
                handleChangeText={setForgotPasswordEmail}
                keyboardType="email-address"
                otherStyles="mb-4"
              />
            </View>
          </CustomModal>
        </View>
      )}
    </SafeAreaView>
  );
};

export default SignIn;
