import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import { useWindowDimensions } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const FancyAlert = ({
  isVisible,
  onClose,
  title,
  message,
  variant = "error",
  autoClose = true,
  autoCloseTime = 3000,
}) => {
  const translateY = new Animated.Value(-100);
  const opacity = new Animated.Value(0);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseTime);
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose && onClose();
    });
  };

  if (!isVisible) return null;

  const getIcon = () => {
    const iconProps = { size: 24, color: styles[variant].iconColor };
    switch (variant) {
      case "success":
        return <Icon name="check-circle" {...iconProps} />;
      case "error":
        return <Icon name="error" {...iconProps} />;
      case "warning":
        return <Icon name="warning" {...iconProps} />;
      case "info":
        return <Icon name="info" {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={{ width: "100%", paddingTop: insets.top }}>
        <Animated.View
          style={[
            styles.container,
            styles[variant].container,
            {
              transform: [{ translateY }],
              opacity,
              width: width - 32,
            },
          ]}
        >
          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>{getIcon()}</View>
            <View style={styles.textContainer}>
              {title && (
                <Text 
                  className="font-psemibold" 
                  style={[styles.title, styles[variant].title]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {title}
                </Text>
              )}
              <Text 
                className="font-pmedium" 
                style={[styles.message, styles[variant].message]}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                {message}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={20} color={styles[variant].iconColor} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: "center",
  },
  container: {
    alignSelf: "center",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
  },
  closeButton: {
    marginLeft: 12,
  },
  success: {
    container: {
      backgroundColor: "#E8F5E9",
      borderLeftWidth: 4,
      borderLeftColor: "#4CAF50",
    },
    title: { color: "#2E7D32" },
    message: { color: "#1B5E20" },
    iconColor: "#2E7D32",
  },
  error: {
    container: {
      backgroundColor: "#FFEBEE",
      borderLeftWidth: 4,
      borderLeftColor: "#EF5350",
    },
    title: { color: "#C62828" },
    message: { color: "#B71C1C" },
    iconColor: "#C62828",
  },
  warning: {
    container: {
      backgroundColor: "#FFF3E0",
      borderLeftWidth: 4,
      borderLeftColor: "#FFB74D",
    },
    title: { color: "#EF6C00" },
    message: { color: "#E65100" },
    iconColor: "#EF6C00",
  },
  info: {
    container: {
      backgroundColor: "#E3F2FD",
      borderLeftWidth: 4,
      borderLeftColor: "#42A5F5",
    },
    title: { color: "#1565C0" },
    message: { color: "#0D47A1" },
    iconColor: "#1565C0",
  },
});

export default FancyAlert;