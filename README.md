# NaaApp - AI-Powered Expense Tracker (Supabase Edition)

A comprehensive React Native mobile application that combines AI capabilities with advanced expense tracking and management features. This version has been fully migrated from Appwrite to Supabase for improved scalability and performance.

## 🚀 Features

### 💰 Expense Management
- **Smart Expense Tracking**: Add, edit, and delete expenses with categories
- **Receipt Scanning**: OCR-powered receipt scanning for automatic expense entry
- **QR Code Scanning**: Quick expense entry via QR codes
- **Category Management**: Create, edit, and delete expense categories
- **Recent Expenses**: View your 10 most recent expenses with sorting
- **Bulk Operations**: Select and delete multiple expenses at once

### 🤖 AI Integration
- **AI Chat**: Interactive chat with AI assistance
- **AI Image Generation**: Create images using natural language prompts via Hugging Face API
- **OCR Processing**: Automatic text extraction from receipt images

### 📊 Analytics & Insights
- **Monthly Totals**: Track total expenses by month
- **Category Analytics**: View spending breakdown by categories
- **Expense Insights**: Detailed spending analysis and patterns
- **Forecasting**: Predict future spending trends

### 🔐 Security & Authentication
- **User Authentication**: Secure login/signup with Supabase Auth (including Google Sign-In)
- **Profile Management**: User profile with avatar support
- **Session Management**: Secure session handling with Row Level Security (RLS)
- **Google OAuth**: Seamless Google Sign-In integration

### 📱 User Experience
- **Modern UI**: Beautiful interface built with NativeWind/Tailwind CSS
- **Push Notifications**: Real-time notifications via OneSignal
- **Cross-Platform**: Works on iOS, Android, and Web
- **Responsive Design**: Optimized for all screen sizes

## 📱 Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (Database, Authentication, Storage, Real-time)
- **AI Services**: 
  - Pollinations.ai for high-quality image generation
  - OCR.space API for receipt text extraction
- **Notifications**: OneSignal
- **State Management**: React Context API
- **Image Processing**: Expo Image Manipulator
- **Camera**: Expo Image Picker
- **Icons**: MaterialIcons from @expo/vector-icons

## 🛠️ Prerequisites

Before running this project, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **EAS CLI**: `npm install -g eas-cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - Mac only)

## ⚙️ Environment Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd NaaApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment variables**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Google OAuth Configuration
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id

   # OneSignal Configuration
   EXPO_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id
   EXPO_PUBLIC_ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key
   EXPO_PUBLIC_ONESIGNAL_CHANNEL_ID=your-onesignal-channel-id

   # OCR Configuration (OCR.space)
   EXPO_PUBLIC_OCR_API_KEY=your-ocr-space-api-key
   ```

## 🚀 Getting Started

1. **Start the development server**
   ```bash
   npx expo start
   ```

2. **Run on different platforms**
   - **iOS Simulator**: Press `i` in the terminal or scan QR code with Expo Go
   - **Android Emulator**: Press `a` in the terminal or scan QR code with Expo Go
   - **Web**: Press `w` in the terminal

## 📁 Project Structure

```
NaaApp/
├── app/                    # App screens (file-based routing)
│   ├── (auth)/            # Authentication screens
│   │   ├── signin.jsx     # Sign in screen
│   │   ├── signup.jsx     # Sign up screen
│   │   └── _layout.jsx    # Auth layout
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── (tracker)/     # Expense tracker tab
│   │   │   ├── categoryList.jsx  # Category management
│   │   │   └── _layout.jsx       # Tracker layout
│   │   ├── chat.jsx       # AI chat screen
│   │   ├── home.jsx       # Home/dashboard
│   │   ├── insights.jsx   # Analytics & insights
│   │   ├── profile.jsx    # User profile
│   │   └── _layout.jsx    # Tab layout
│   ├── _layout.jsx        # Root layout
│   └── index.jsx          # Landing page
├── components/            # Reusable components
│   ├── AI.jsx            # AI chat component
│   ├── CustomAlert.jsx   # Alert component
│   ├── CustomButton.jsx  # Button component
│   ├── CustomModal.jsx   # Modal component
│   ├── Expense.jsx       # Main expense tracker
│   ├── ExpenseItem.jsx   # Individual expense item
│   ├── Forecasting.jsx   # Expense forecasting
│   ├── FormFields.jsx    # Form input fields
│   ├── Insights.jsx      # Analytics component
│   └── QRScanner.jsx     # QR code scanner
├── constants/             # App constants
│   ├── icons.js          # Icon exports
│   ├── images.js         # Image exports
│   └── index.js          # Combined exports
├── context/               # React Context providers
│   ├── AlertProvider.js  # Alert state management
│   └── GlobalProvider.js # Global app state
├── lib/                   # Utilities and API functions
│   ├── APIs/             # API service functions
│   │   ├── CategoryApiSupabase.js # Category CRUD operations (Supabase)
│   │   ├── ExpenseApiSupabase.js  # Expense CRUD operations (Supabase)
│   │   └── UserApiSupabase.js     # User management (Supabase)
│   ├── AIconfig.js       # AI service configuration
│   ├── supabase.js       # Supabase configuration
│   ├── firebaseconfig.js # Firebase configuration
│   └── ocr.js            # OCR processing utilities
├── assets/               # Static assets
│   ├── fonts/           # Custom fonts
│   ├── icons/           # App icons
│   └── images/          # Images and graphics
└── package.json
```

## 🔧 Configuration

### Supabase Setup
1. Create a Supabase project
2. Run the provided database schema (`database_schema.sql`)
3. Configure Row Level Security (RLS) policies
4. Set up Google OAuth in Authentication settings
5. Add your Supabase credentials to `.env`

### OneSignal Setup
1. Create a OneSignal app
2. Configure for iOS and Android
3. Add your OneSignal App ID to `.env`

### AI Image Generation
The app uses Pollinations.ai for image generation, which requires no API key setup. Images are generated in HD quality (1024x1024) with enhanced quality settings.

### OCR.space Setup
1. Create an OCR.space account
2. Get your API key
3. Add the API key to `.env`

## 📱 Building for Production

### Android
```bash
# Build APK
npx eas build --platform android --profile production

# Build AAB for Play Store
npx eas build --platform android --profile production --type app-bundle
```

### iOS
```bash
# Build for App Store
npx eas build --platform ios --profile production
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📝 Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web
- `npm test` - Run tests
- `npm run lint` - Run linter
- `npm run build:android` - Build Android APK
- `npm run prebuild` - Prebuild native code

## 🔒 Security Notes

- Passwords are handled securely by Supabase Auth (no plain text storage)
- API keys are stored in environment variables
- User sessions are managed by Supabase authentication
- Row Level Security (RLS) ensures data isolation between users
- Google OAuth provides secure third-party authentication

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npx expo start --clear
   ```

2. **iOS build issues**
   ```bash
   cd ios && pod install
   ```

3. **Android build issues**
   ```bash
   npx expo run:android --clear
   ```

4. **Environment variables not loading**
   - Ensure `.env` file is in root directory
   - Restart the development server
   - Check variable names start with `EXPO_PUBLIC_`

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review Expo and Appwrite documentation

## 🙏 Acknowledgments

- **Expo Team** for the excellent React Native framework
- **Supabase** for the powerful open-source backend-as-a-service
- **OneSignal** for reliable push notifications
- **Pollinations.ai** for high-quality AI image generation
- **OCR.space** for OCR processing capabilities
