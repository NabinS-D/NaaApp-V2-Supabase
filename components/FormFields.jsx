import React, { useState } from "react";
import { TextInput, Text, View, TouchableOpacity, Image } from "react-native";
import { icons } from "../constants";

const FormFields = ({
  title = null,
  value,
  handleChangeText,
  otherStyles,
  placeholder,
  inputfieldcolor = "bg-black-100",
  textcolor = "text-white-100",
  titlecolor = "text-black-100",
  bordercolor = "border-black-100", // New prop for border color
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className={`space-y-2 ${otherStyles}`}>
      {title && (
        <Text className={`font-pmedium text-base ${titlecolor}`}>{title}</Text>
      )}
      <View
        className={`px-4 rounded-2xl ${inputfieldcolor} ${bordercolor} border flex-row`}
      >
        <TextInput
          className={`${textcolor} font-psemibold text-base py-4 flex-1`}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#7b7b8e"
          onChangeText={handleChangeText}
          secureTextEntry={title?.toLowerCase() === "password" && !showPassword}
          {...props}
        />
        {title?.toLowerCase() === "password" && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="ml-2 justify-center"
          >
            <Image
              className="w-6 h-6"
              source={showPassword ? icons.eyeHide : icons.eye}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FormFields;
