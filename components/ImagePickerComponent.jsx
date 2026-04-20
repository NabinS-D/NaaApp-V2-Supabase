import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import CustomModal from './CustomModal';
import useAlertContext from '../context/AlertProvider';

const ImagePickerComponent = ({
  visible,
  onClose,
  onImageSelected,
  title = "Select Image",
  showCamera = true,
  showGallery = true,
  allowsEditing = true,
  quality = 0.8,
  aspect = [4, 3],
  includeBase64 = false,
  mediaTypes = ImagePicker.MediaTypeOptions.Images,
  children,
}) => {
  const { showAlert } = useAlertContext();

  const requestPermissions = useCallback(async (type) => {
    try {
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showAlert(
            'Permission Required',
            'Please grant camera permissions to take photos.',
            'error'
          );
          return false;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showAlert(
            'Permission Required',
            'Please grant media library permissions to access photos.',
            'error'
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      showAlert('Error', 'Failed to request permissions.', 'error');
      return false;
    }
  }, [showAlert]);

  const pickFromCamera = useCallback(async () => {
    const hasPermission = await requestPermissions('camera');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes,
        allowsEditing,
        aspect,
        quality,
        base64: includeBase64,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0]);
        onClose();
      }
    } catch (error) {
      showAlert('Error', 'Failed to take photo. Please try again.', 'error');
    }
  }, [requestPermissions, mediaTypes, allowsEditing, aspect, quality, includeBase64, onImageSelected, onClose, showAlert]);

  const pickFromGallery = useCallback(async () => {
    const hasPermission = await requestPermissions('gallery');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing,
        aspect,
        quality,
        base64: includeBase64,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0]);
        onClose();
      }
    } catch (error) {
      showAlert('Error', 'Failed to pick image. Please try again.', 'error');
    }
  }, [requestPermissions, mediaTypes, allowsEditing, aspect, quality, includeBase64, onImageSelected, onClose, showAlert]);

  // If children are provided, render them as trigger buttons
  if (children) {
    return (
      <View>
        {children}
        <CustomModal
          modalVisible={visible}
          onSecondaryPress={onClose}
          title={title}
          secondaryButtonText="Cancel"
          showPrimaryButton={false}
        >
          <View className="w-full">
            {showCamera && (
              <TouchableOpacity
                onPress={pickFromCamera}
                className="flex-row items-center justify-center bg-blue-100 p-4 rounded-lg mb-3"
              >
                <MaterialIcons name="camera-alt" size={24} color="#3B82F6" />
                <Text className="text-blue-600 font-pmedium ml-2 text-base">Take Photo</Text>
              </TouchableOpacity>
            )}
            
            {showGallery && (
              <TouchableOpacity
                onPress={pickFromGallery}
                className="flex-row items-center justify-center bg-green-100 p-4 rounded-lg"
              >
                <MaterialIcons name="photo-library" size={24} color="#10B981" />
                <Text className="text-green-600 font-pmedium ml-2 text-base">Choose from Gallery</Text>
              </TouchableOpacity>
            )}
          </View>
        </CustomModal>
      </View>
    );
  }

  // Default inline buttons (for backward compatibility)
  return (
    <View className="flex-row gap-2">
      {showCamera && (
        <TouchableOpacity
          onPress={pickFromCamera}
          className="flex-1 bg-blue-100 p-3 rounded-lg flex-row items-center justify-center"
        >
          <MaterialIcons name="camera-alt" size={20} color="#3B82F6" />
          <Text className="text-blue-600 font-pmedium ml-2">Camera</Text>
        </TouchableOpacity>
      )}

      {showGallery && (
        <TouchableOpacity
          onPress={pickFromGallery}
          className="flex-1 bg-green-100 p-3 rounded-lg flex-row items-center justify-center"
        >
          <MaterialIcons name="photo-library" size={20} color="#10B981" />
          <Text className="text-green-600 font-pmedium ml-2">Gallery</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ImagePickerComponent;
