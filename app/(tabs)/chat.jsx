import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  StyleSheet,
  SafeAreaView, 
  ActivityIndicator, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { useGlobalContext } from '../../context/GlobalProvider';
import { Ionicons } from '@expo/vector-icons';
import { sendMessage, getMessages, subscribeToMessages } from '../../lib/APIs/ChatApiSupabase';

export default function GroupChat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const { userdetails } = useGlobalContext();
  const flatListRef = useRef(null);

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  const loadMessages = async (pageNum = 1) => {
    if (loadingMore || (pageNum > 1 && !hasMore)) return;

    if (pageNum === 1) {
      setIsLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const newMessages = await getMessages(pageNum, 20);
      if (newMessages.length < 20) {
        setHasMore(false);
      }
      
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
        return pageNum === 1 ? newMessages : [...prev, ...uniqueNewMessages];
      });

    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadMessages();
    
    // Subscribe to new messages
    const subscription = subscribeToMessages((newMessage) => {
      setMessages(prevMessages => {
        // Check if message already exists to prevent duplicates
        const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
        if (messageExists) return prevMessages;
        
        return [newMessage, ...prevMessages];
      });
    });

    // Keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const sendChatNotification = async (message, senderUsername, senderUserId) => {
    try {
      const notificationData = {
        app_id: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
        included_segments: ["All"],
        excluded_external_user_ids: [senderUserId],
        headings: { en: "New Message" },
        contents: { en: `${senderUsername}: ${message.substring(0, 50)}` },
        data: { type: "chat_message" },
        android_channel_id: process.env.EXPO_PUBLIC_ONESIGNAL_CHANNEL_ID,
      };

      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(notificationData),
      });

      if (!response.ok) {
        console.error("Notification failed:", await response.text());
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage.trim();
    setIsSending(true);
    
    // Optimistically add message to UI immediately
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: userdetails.id,
      sender: { username: userdetails.username },
      created_at: new Date().toISOString(),
      isTemporary: true
    };
    
    setMessages(prev => [tempMessage, ...prev]);
    setNewMessage('');

    try {
      const sentMessage = await sendMessage(userdetails.id, messageContent);
      
      // Replace temporary message with actual message
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? { ...sentMessage, sender: { username: userdetails.username } } : msg
      ));
      
      // Send notification after message is sent
      await sendChatNotification(messageContent, userdetails.username, userdetails.id);

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      // Restore message text on error
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(nextPage);
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender_id === userdetails?.id;
    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        {!isMyMessage && <Text style={styles.username}>{item.sender?.username || 'User'}</Text>}
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C94C8" />
        <Text style={styles.loadingText}>Loading Chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={isKeyboardVisible ? (Platform.OS === 'ios' ? 90 : 40) : 0}
      >
        <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 mb-2" style={{ marginTop: 60 }}>
          <Text className="text-2xl text-cyan-100 font-pbold text-center">Global Chat</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          style={styles.messageList}
          contentContainerStyle={{ paddingBottom: 80 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore && <ActivityIndicator size="small" color="#FFF" />}
        />

        <View className="flex-row p-3 bg-[#7C1F4E] items-end" style={{ paddingBottom: 5 }}>
          <TextInput
            className="flex-1 mr-3 p-3 bg-gray-100 rounded-xl text-black text-base"
            style={{ 
              minHeight: 44,
              maxHeight: 120,
              textAlignVertical: 'top'
            }}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            multiline={true}
            textAlignVertical="center"
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            style={[styles.sendButton, (!newMessage.trim() || isSending) && styles.disabledButton]}
          >
            {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={22} color="white" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    lineHeight: 22,
    flexWrap: 'wrap',
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
    marginBottom: 2,
  },
  disabledButton: {
    backgroundColor: "#A0A0A0",
    opacity: 0.7,
  },
});
