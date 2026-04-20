import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
  Alert,
  Pressable,
  Modal,
} from "react-native";
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import CustomModal from './CustomModal';
// Removed Appwrite import - using Supabase now
import { useGlobalContext } from "../context/GlobalProvider.js";
import { config, databases } from "../lib/AIconfig.js";
import { handleUserChatData } from "../lib/APIs/UserApiSupabase.js";
import useAlertContext from "../context/AlertProvider.js";

// Separate message creation logic
const createMessage = (text, sender, imageData = null) => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  text,
  sender,
  imageData,
  timestamp: new Date().toISOString(),
});

const AIChat = () => {
  const { user, isLoggedIn } = useGlobalContext();
  const { showAlert } = useAlertContext();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoadingChatHistory, setIsLoadingChatHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const flatListRef = useRef(null);

  // Fetch chat history
  const fetchChatHistory = useCallback(async () => {
    if (!isLoggedIn || !user) return;

    setIsLoadingChatHistory(true);
    try {
      const chatHistory = await handleUserChatData(user.id);
      if (!chatHistory?.length) {
        setMessages([]);
        return;
      }

      const formattedMessages = chatHistory
        .flatMap((doc) => {
          const messages = [];
          if (doc.image_url) {
            messages.push(
              createMessage("Here's your generated image", "ai", doc.image_url)
            );
          }
          if (doc.message) {
            messages.push(createMessage(doc.message, "user"));
          }
          return messages;
        })
        .reverse();

      setMessages(formattedMessages);
    } catch (error) {
      showAlert(
        "Error",
        `Could not load chat history. ${error.message}`,
        "error"
      );
    } finally {
      setIsLoadingChatHistory(false);
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  // Image generation using Pollinations.ai (faster & better quality)
  const generateImage = useCallback(async (prompt) => {
    try {
      // Encode prompt for URL
      const encodedPrompt = encodeURIComponent(prompt);

      // Pollinations.ai API - much faster and better quality (HD: 1024x1024)
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&enhance=true&nologo=true`;

      // Fetch the image
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Image generation error:', error);
      showAlert(
        "Error",
        "Failed to generate image. Please try again.",
        "error"
      );
      throw error;
    }
  }, []);

  // Database operations
  const saveToDatabase = useCallback(
    async (userMessage, imageData) => {
      if (!isLoggedIn || !user) return;

      try {
        await databases.createDocument(
          null,
          'ai_chats',
          `${Date.now().toString()}_${Math.random().toString(36).substr(2, 9)}`,
          {
            message: userMessage,
            image_url: imageData,
            user_id: user.id,
          }
        );
      } catch (error) {
        showAlert("Database error:", error.message, "error");
        if (error.code === 401) {
          showAlert(
            "Session Expired",
            "Please log in again to save your chat history."
          );
        }
      }
    },
    [isLoggedIn, user]
  );

  // Message handling
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isLoading) return;

    setIsLoading(true);
    setInputText("");

    // Add user message immediately
    const userMessage = createMessage(trimmedInput, "user");
    setMessages((prev) => [...prev, userMessage]);

    try {
      const base64Image = await generateImage(trimmedInput);
      const aiMessage = createMessage(
        "Here's your generated image",
        "ai",
        base64Image
      );

      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(true);
      await saveToDatabase(trimmedInput, base64Image);
    } catch (error) {
      const errorMessage = createMessage(
        "Sorry, I encountered an error generating your image. Please try again.",
        "ai"
      );
      setMessages((prev) => [...prev, errorMessage]);
      showAlert(
        "Error",
        "Failed to generate image. Please try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, generateImage, saveToDatabase]);

  // Image download functionality
  const handleImageLongPress = useCallback((imageUri) => {
    setSelectedImageUri(imageUri);
    setShowDownloadModal(true);
  }, []);

  const downloadImage = async () => {
    setIsDownloading(true);

    try {
      // Check if we already have permissions
      let { status } = await MediaLibrary.getPermissionsAsync();

      // Only request if we don't have permissions
      if (status !== 'granted') {
        const permissionResult = await MediaLibrary.requestPermissionsAsync();
        status = permissionResult.status;
      }

      if (status !== 'granted') {
        showAlert(
          'Permission Required',
          'Please grant media library access to download images.',
          'error'
        );
        setIsDownloading(false);
        return;
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `NaaApp_Generated_${timestamp}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Handle base64 images vs URL images
      let downloadResult;
      if (selectedImageUri.startsWith('data:')) {
        // For base64 images, write directly to file
        const base64Data = selectedImageUri.split(',')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        downloadResult = { status: 200, uri: fileUri };
      } else {
        // For URL images, download normally
        downloadResult = await FileSystem.downloadAsync(selectedImageUri, fileUri);
      }

      if (downloadResult.status === 200) {
        // Save to media library without creating album (reduces permission prompts)
        await MediaLibrary.createAssetAsync(downloadResult.uri);

        showAlert(
          'Success',
          'Image downloaded successfully to your gallery!',
          'success'
        );
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      showAlert(
        'Download Failed',
        'Could not download the image. Please try again.',
        'error'
      );
    } finally {
      setIsDownloading(false);
      setShowDownloadModal(false);
      setSelectedImageUri(null);
    }
  };

  const cancelDownload = useCallback(() => {
    setShowDownloadModal(false);
    setSelectedImageUri(null);
  }, []);

  // UI Components
  const MessageItem = useMemo(
    () =>
      ({ item }) =>
      (
        <View
          className={`max-w-[80%] my-1 p-3 rounded-xl ${item.sender === "user"
            ? "self-end bg-blue-500 rounded-br-sm"
            : "self-start bg-gray-200 rounded-bl-sm"
            }`}
        >
          <Text
            className={`text-base ${item.sender === "user" ? "text-white" : "text-black"
              }`}
            style={{ flexShrink: 1 }}
          >
            {item.text}
          </Text>
          {item.imageData && (
            <Pressable
              onLongPress={() => handleImageLongPress(item.imageData)}
              delayLongPress={500}
            >
              <Image
                source={{ uri: item.imageData }}
                className="w-48 h-48 mt-3 rounded-xl"
                resizeMode="contain"
              />
            </Pressable>
          )}
          <Text className="text-xs text-black mt-1 self-end">
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      ),
    []
  );

  if (isLoadingChatHistory) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#5C94C8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#7C1F4E]">
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => <MessageItem item={item} />}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        className="flex-1 px-4 py-2"
      />

      <View className="flex-row p-3 bg-[#7C1F4E] items-center">
        <TextInput
          className="flex-1 mr-3 p-3 bg-gray-100 rounded-xl max-h-24 text-black text-base"
          value={inputText}
          onChangeText={setInputText}
          placeholder="Describe the image you want to generate..."
          multiline
          maxLength={10000}
          placeholderTextColor="#666"
          editable={!isLoading}
        />
        <TouchableOpacity
          className={`justify-center items-center rounded-xl h-12 w-24 ${isLoading ? "bg-gray-400" : "bg-blue-500"
            }`}
          onPress={handleSendMessage}
          disabled={isLoading || !inputText.trim()}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Generate</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Download Confirmation Modal */}
      <CustomModal
        title="Download Image"
        modalVisible={showDownloadModal}
        primaryButtonText="Download"
        secondaryButtonText="Cancel"
        onPrimaryPress={downloadImage}
        onSecondaryPress={cancelDownload}
      >
        <Text className="text-base text-center text-gray-600 mb-4">
          Do you want to download this HD image to your gallery?
        </Text>
      </CustomModal>
    </KeyboardAvoidingView>
  );
};

export default AIChat;
