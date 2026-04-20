import { Image, Text, View } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { images } from "../../constants";
import FormFields from "../../components/FormFields";
import CustomButton from "../../components/CustomButton";
import { Link, router } from "expo-router";
import { createUser } from "../../lib/APIs/UserApiSupabase.js";
import { useGlobalContext } from "../../context/GlobalProvider.js";
import useAlertContext from "../../context/AlertProvider";

const SignUp = () => {
  const { checkAuth } = useGlobalContext();
  const { showAlert } = useAlertContext();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [isSubmitting, setisSubmitting] = useState(false);

  const submit = async ({ email, password, username }) => {
    if (username === "") {
      showAlert("Error", "Username cannot be empty!", "error");
      return;
    }
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
      await createUser(email, password, username);
      await checkAuth();
      router.replace("/(tabs)/home");
    } catch (error) {
      showAlert(
        "SignUp Error",
        `Something went wrong! ${error.message}`,
        "error"
      );
    } finally {
      setisSubmitting(false);
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
            className="w-[120px] h-[60px] mx-auto "
          />

          {/* Text below Image */}
          <Text className="text-white text-3xl font-semibold mt-8 font-psemibold text-center">
            Log in to NaaApp
          </Text>
          <FormFields
            title="Username"
            value={form.username}
            handleChangeText={(text) => setForm({ ...form, username: text })}
            otherStyles="mt-7"
            placeholder="Enter your username"
            textcolor="text-white"
            titlecolor="text-gray-100"
          />
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
            title="Sign Up"
            containerStyles="mt-4 mb-4"
            handlePress={() => submit(form)}
            isLoading={isSubmitting}
            fullWidth={true}
          />
          <View className="justify-center pt-5 flex-row gap-2">
            <Text className=" text-gray-100 font-psemibold text-base text-center">
              Already have an account?{" "}
              <Link
                className="text-secondary-200 font-psemibold"
                href="/(auth)/signin"
              >
                Sign In
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
