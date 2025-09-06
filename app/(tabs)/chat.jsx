import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { database } from "../../lib/firebaseconfig";
import {
  onValue,
  ref,
  push,
  query,
  orderByChild,
  limitToLast,
} from "firebase/database";
import { useGlobalContext } from "../../context/GlobalProvider";
import useAlertContext from "../../context/AlertProvider";
import { Ionicons } from "@expo/vector-icons";

export default function GroupChat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { userdetails, user } = useGlobalContext();
  const [username, setUsername] = useState(userdetails?.username || user?.email?.split('@')[0] || "Anonymous");
  const flatListRef = useRef(null);
  const [pageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Memoized date formatter
  const formatDate = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  // Setup username only once
  useEffect(() => {
    const setupUsername = async () => {
      try {
        if (userdetails?.username) {
          setUsername(userdetails.username);
        } else {
          const savedUsername = await AsyncStorage.getItem("username");
          if (savedUsername) {
            setUsername(savedUsername);
          } else {
            const newUsername = `User${Math.floor(Math.random() * 1000)}`;
            await AsyncStorage.setItem("username", newUsername);
            setUsername(newUsername);
          }
        }
      } catch (error) {
        console.error("Error with username:", error);
      }
    };

    setupUsername();
  }, [userdetails]);

  // Load messages with proper loading state management
  useEffect(() => {
    // Only show loading indicator for initial load
    if (currentPage === 1) {
      setInitialLoading(true);
    } else {
      setLoadingMore(true);
    }

    const messagesRef = query(
      ref(database, "messages"),
      orderByChild("timestamp"),
      limitToLast(pageSize * currentPage)
    );

    const unsubscribe = onValue(
      messagesRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messageList = Object.entries(data).map(([id, msg]) => ({
            id,
            ...msg,
          }));

          // Sort messages by timestamp (newest first)
          const sortedMessages = messageList.sort(
            (a, b) => b.timestamp - a.timestamp
          );
          setMessages(sortedMessages);
        } else {
          setMessages([]);
        }

        // Clear loading states
        setInitialLoading(false);
        setLoadingMore(false);
      },
      (error) => {
        console.error("Error loading messages:", error);
        setInitialLoading(false);
        setLoadingMore(false);
      }
    );

    // Cleanup function
    return () => unsubscribe();
  }, [currentPage, pageSize, userdetails]);

  // Send message with improved notifications
  const sendMessage = async () => {
    if (newMessage.trim()) {
      try {
        // First save to Firebase
        const messagesRef = ref(database, "messages");
        const messageData = {
          text: newMessage,
          username: username,
          timestamp: Date.now(),
          userId: user?.id || "anonymous", // Use account ID consistently
        };

        await push(messagesRef, messageData);

        // Send OneSignal notification to all users except sender (use user account ID which matches OneSignal external ID)
        await sendChatNotification(newMessage, userdetails?.username || user?.email?.split('@')[0] || "Anonymous", user?.id || "anonymous");

        setNewMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  // Improved notification function using OneSignal directly
  const sendChatNotification = async (message, senderUsername, senderUserId) => {
    try {

      const notificationData = {
        app_id: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
        included_segments: ["All"], // Send to all users
        excluded_external_user_ids: [senderUserId], // Exclude sender
        headings: {
          en: "New Message"
        },
        contents: {
          en: `${senderUsername}: ${message.length > 50 ? message.substring(0, 50) + "..." : message}`
        },
        data: {
          type: "chat_message",
          sender: senderUsername,
          senderId: senderUserId,
          message: message
        },
        android_channel_id: `${process.env.EXPO_PUBLIC_ONESIGNAL_CHANNEL_ID}`,
        priority: 10
      };

      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key ${process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify(notificationData)
      });

      if (!response.ok) {
        console.error("Notification failed:", await response.text());
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const loadMoreMessages = () => {
    if (!loadingMore && !initialLoading) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage =
      item.username === username || item.userId === userdetails?.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (initialLoading) {
      return (
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5C94C8" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </SafeAreaView>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 mt-14 mb-2">
        <Text className="text-2xl text-cyan-100 font-pbold text-center">
          Chat Room
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        style={styles.messageList}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      <View className="flex-row p-3 bg-[#7C1F4E] items-center justify-center">
        <TextInput
          className="flex-1 mr-3 mt-2 p-3 bg-gray-100 rounded-xl h-12 text-black text-base"
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#666"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!newMessage.trim()}
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.disabledButton,
          ]}
        >
          <Ionicons name="send" size={22} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#7C1F4E",
  },
  messageList: {
    flex: 1,
    padding: 15,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: "80%",
  },
  myMessage: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  username: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    color: "#666",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#7C1F4E",
  },
  loadingText: {
    color: "white",
    marginTop: 10,
  },
  loaderContainer: {
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButton: {
    backgroundColor: "#5C94C8",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#A0A0A0",
    opacity: 0.7,
  },
});
