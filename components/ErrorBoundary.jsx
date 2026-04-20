import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // In production, you might want to log this to a crash reporting service
    // Example: Crashlytics.recordError(error);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Navigate to home screen
    router.replace('/(tabs)/home');
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    router.replace('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-[#7C1F4E]">
          <View className="flex-1 justify-center items-center px-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-lg">
              <Text className="text-2xl font-pbold text-center text-red-600 mb-4">
                Oops! Something went wrong
              </Text>
              
              <Text className="text-base font-pregular text-gray-700 text-center mb-6">
                We encountered an unexpected error. Don't worry, your data is safe.
              </Text>

              {__DEV__ && this.state.error && (
                <ScrollView className="max-h-32 mb-4 bg-gray-100 p-3 rounded-lg">
                  <Text className="text-xs font-mono text-red-800">
                    {this.state.error.toString()}
                  </Text>
                  {this.state.errorInfo && (
                    <Text className="text-xs font-mono text-red-600 mt-2">
                      {this.state.errorInfo.componentStack}
                    </Text>
                  )}
                </ScrollView>
              )}

              <View className="space-y-3">
                <TouchableOpacity
                  onPress={this.handleRestart}
                  className="bg-[#7C1F4E] py-3 px-6 rounded-xl"
                >
                  <Text className="text-white font-psemibold text-center text-base">
                    Try Again
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={this.handleGoHome}
                  className="bg-gray-500 py-3 px-6 rounded-xl"
                >
                  <Text className="text-white font-psemibold text-center text-base">
                    Go to Home
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
