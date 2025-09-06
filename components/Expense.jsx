import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Image,
  Pressable,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import ImagePickerComponent from './ImagePickerComponent';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useGlobalContext } from "../context/GlobalProvider.js";
import CustomModal from "./CustomModal.jsx";
import { addExpenses, deleteExpenseById, getReceiptImageUrl, fetchAllExpenses, deleteAllExpensesById } from "../lib/APIs/ExpenseApiSupabase";
import { addaCategory, fetchAllCategories } from "../lib/APIs/CategoryApiSupabase.js";
import CustomButton from "./CustomButton.jsx";
import FormFields from "./FormFields.jsx";
import useAlertContext from "../context/AlertProvider.js";
import QRScanner from "./QRScanner.jsx";
import ExpenseFilter from "./ExpenseFilter.jsx";
import CSVUploader from "./CSVUploader.jsx";
import { processImageWithOCR, parseOCRText } from "../lib/ocr.js";

// Memoized Header Buttons Component
const HeaderButtons = memo(({ onAddExpense, onAddCategory, onListCategories, onScanReceipt, onScanQR, onFilter, onCSVUpload }) => (
  <View className="mb-8">
    {/* All Action Buttons - 2 per row */}
    <View className="flex-row flex-wrap justify-between gap-y-3">
      <View className="w-[48%]">
        <CustomButton
          title="Add Expense"
          handlePress={onAddExpense}
          containerStyles="w-full"
          buttoncolor="bg-blue-500"
          textStyles="text-white text-sm font-pmedium text-center"
        />
      </View>

      <View className="w-[48%]">
        <CustomButton
          title="Filter"
          handlePress={onFilter}
          containerStyles="w-full"
          buttoncolor="bg-purple-500"
          textStyles="text-white text-sm font-pmedium text-center"
        />
      </View>

      <View className="w-[48%]">
        <CustomButton
          title="Add Category"
          handlePress={onAddCategory}
          containerStyles="w-full"
          buttoncolor="bg-green-500"
          textStyles="text-white text-sm font-pmedium text-center"
        />
      </View>

      <View className="w-[48%]">
        <CustomButton
          title="Categories"
          handlePress={onListCategories}
          containerStyles="w-full"
          buttoncolor="bg-orange-500"
          textStyles="text-white text-sm font-pmedium text-center"
        />
      </View>

      <View className="w-[48%]">
        <CustomButton
          title="Scan Receipt"
          handlePress={onScanReceipt}
          containerStyles="w-full"
          buttoncolor="bg-cyan-500"
          textStyles="text-white text-sm font-pmedium text-center"
        />
      </View>

      <View className="w-[48%]">
        <CustomButton
          title="Scan QR"
          handlePress={onScanQR}
          containerStyles="w-full"
          buttoncolor="bg-indigo-500"
          textStyles="text-white text-sm font-pmedium text-center"
        />
      </View>

      {/* Full width button */}
      <View className="w-full">
        <CustomButton
          title="Import CSV"
          handlePress={onCSVUpload}
          containerStyles="w-full"
          buttoncolor="bg-emerald-500"
          textStyles="text-white text-sm font-pmedium text-center"
        />
      </View>
    </View>
  </View>

));

// Memoized Category Item Component
const CategoryItem = memo(({ item, total, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <View className="bg-white p-4 rounded-lg mr-2">
      <Text className="font-medium">{item.category_name}</Text>
      <Text className="text-lg">Rs {total?.toFixed(2) || "0.00"}</Text>
    </View>
  </TouchableOpacity>
));

// Memoized Categories List Component
const CategoriesList = memo(({ categories, categoryTotals }) => {
  if (categories.length === 0) {
    return (
      <Text className="text-xl text-cyan-100 font-psemibold mb-2">
        No Categories found.
      </Text>
    );
  }

  return (
    <FlatList
      data={categories}
      horizontal
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <CategoryItem
          item={item}
          total={categoryTotals[item.id]}
          onPress={() =>
            router.push({
              pathname: "details",
              params: {
                categoryId: item?.id,
                title: item.category_name,
              },
            })
          }
        />
      )}
      keyExtractor={(item) => item?.id}
    />
  );
});

// Memoized Expense Item Component
const ExpenseItem = memo(({ item, onLongPress, isSelected, onSelect, onDelete, onViewReceipt }) => {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      timeZone: "Asia/Kathmandu",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <TouchableOpacity
      onLongPress={() => onLongPress(item)}
      onPress={() => onSelect(item)}
    >
      <View className="bg-white p-4 rounded-lg mb-2 flex-row justify-between items-center">
        <View className="flex-1 flex-row gap-2 items-center mr-2">
          <MaterialIcons
            name={isSelected ? "check-box" : "check-box-outline-blank"}
            size={24}
            color="#4630EB"
          />
          <View className="flex-1">
            <Text
              className="font-pmedium"
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.description}
            </Text>
            {item.receipt_image && (
              <TouchableOpacity
                className="flex-row items-center mt-1"
                onPress={() => {
                  onViewReceipt(item.receipt_image);
                }}
              >
                <MaterialIcons name="image" size={14} color="#10B981" />
                <Text className="text-green-600 text-xs ml-1 underline">View receipt</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="items-end">
            <Text className="text-lg font-psemibold">
              Rs {parseFloat(item.amount).toFixed(2)}
            </Text>
            <Text className="text-gray-500 text-xs">{formatDate(item.created_at)}</Text>
          </View>
          <TouchableOpacity onPress={() => onDelete(item)}>
            <MaterialIcons name="delete" size={20} color="red" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Memoized Add Expense Modal Component
const AddExpenseModal = memo(
  ({
    visible,
    onClose,
    onAdd,
    categories,
    expense,
    setExpense,
    scannedImage,
    handleImageSelected,
  }) => (
    <CustomModal
      modalVisible={visible}
      onSecondaryPress={onClose}
      title="Add Expense"
      primaryButtonText="Add"
      secondaryButtonText="Cancel"
      onPrimaryPress={onAdd}
    >
      <View className="w-full">
        <FormFields
          placeholder="Amount"
          value={expense.amount}
          inputfieldcolor="bg-gray-200" // Light gray background
          textcolor="text-gray-800" // Darker text
          bordercolor="border-gray-400" // Gray border
          handleChangeText={(text) => setExpense({ ...expense, amount: text })}
          otherStyles="mb-4"
        />

        <FormFields
          placeholder="Description"
          value={expense.description}
          inputfieldcolor="bg-gray-200" // Light gray background
          textcolor="text-gray-800" // Darker text
          bordercolor="border-gray-400" // Gray border
          handleChangeText={(text) =>
            setExpense({ ...expense, description: text })
          }
          otherStyles="mb-4"
        />

        <View
          className={`border rounded-2xl overflow-hidden mb-4 w-full border-gray-400`}
        >
          <Picker
            useNativeAndroidPickerStyle={false}
            selectedValue={expense.categoryId}
            onValueChange={(itemValue) =>
              setExpense({ ...expense, categoryId: itemValue })
            }
            style={{
              backgroundColor: "#E5E7EB",
              color: "gray-800",
            }}
            mode="dropdown"
          >
            <Picker.Item label="Select Category" value="" />
            {categories.map((category) => (
              <Picker.Item
                key={category?.id}
                label={category.category_name}
                value={category?.id}
              />
            ))}
          </Picker>
        </View>

        <FormFields
          placeholder="Date"
          value={expense.date || new Date().toISOString().split("T")[0]} // Default to today
          inputfieldcolor="bg-gray-200" // Light gray background
          textcolor="text-gray-800" // Darker text
          bordercolor="border-gray-400" // Gray border
          handleChangeText={(text) => setExpense({ ...expense, date: text })}
          otherStyles="mb-4"
          inputProps={{ type: "date" }} // HTML5 date picker
        />

        {/* Image Upload Section */}
        <View className="mb-4">
          <Text className="text-gray-800 font-pmedium text-base mb-2">
            Receipt Image (Optional)
          </Text>

          <ImagePickerComponent
            onImageSelected={handleImageSelected}
            quality={0.8}
            aspect={[4, 3]}
          />

          {(expense.receiptImage || scannedImage) && (
            <View className="relative">
              <Image
                source={{ uri: expense.receiptImage?.uri || expense.receiptImage || scannedImage }}
                style={{ width: "100%", height: 150, borderRadius: 8 }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setExpense({ ...expense, receiptImage: null })}
                className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
              >
                <MaterialIcons name="close" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </CustomModal>
  )
);

const ExpenseTracker = () => {
  const { userdetails } = useGlobalContext();
  
  // Early return if user is not logged in
  if (!userdetails) {
    return (
      <View className="flex-1 justify-center items-center bg-pink-900">
        <Text className="text-white text-lg">Please log in to view expenses</Text>
      </View>
    );
  }
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: "",
    description: "",
    categoryId: "",
    date: new Date().toISOString().split("T")[0], // Default to today
    receiptImage: null,
  });
  const [isExpenseActionModalVisible, setExpenseActionModalVisible] =
    useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: "" });
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert, alert } = useAlertContext();

  const [selectedItems, setSelectedItems] = useState([]);
  const selectedItemsRef = useRef([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedImage, setScannedImage] = useState(null);
  const [isQRScannerVisible, setQRScannerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceiptImage, setSelectedReceiptImage] = useState(null);
  const [isReceiptImageModalVisible, setReceiptImageModalVisible] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedImageForDownload, setSelectedImageForDownload] = useState(null);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    category: '',
    dateFrom: null,
    dateTo: null,
    amountMin: '',
    amountMax: '',
  });
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [filteredTotalAmount, setFilteredTotalAmount] = useState(0);
  const [isCSVUploaderVisible, setCSVUploaderVisible] = useState(false);

  const handleImageSelected = useCallback((asset) => {
    // Store the complete asset information for proper upload
    setNewExpense({ ...newExpense, receiptImage: asset });
  }, [newExpense]);

  // Memoized category totals calculation
  const categoryTotals = React.useMemo(() => {
    return expenses.reduce((acc, expense) => {
      const categoryId = expense.categories?.id;
      if (categoryId) {
        acc[categoryId] = (acc[categoryId] || 0) + parseFloat(expense.amount);
      }
      return acc;
    }, {});
  }, [expenses]);

  const TotalExpenseForMonth = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return expenses.reduce((acc, expense) => {
      // Use created_at from Supabase
      const expenseDate = new Date(expense.created_at);
      if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
        return acc + parseFloat(expense.amount);
      }
      return acc;
    }, 0);
  }, [expenses]);

  const getDateRangeText = useMemo(() => {
    if (!hasActiveFilters) return "This Month Total Expense";

    const { dateFrom, dateTo } = activeFilters;
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      const toDate = new Date(dateTo).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      return `Total Expenses (${fromDate} to ${toDate})`;
    } else if (dateFrom) {
      const fromDate = new Date(dateFrom).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      return `Total Expenses (from ${fromDate})`;
    } else if (dateTo) {
      const toDate = new Date(dateTo).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      return `Total Expenses (until ${toDate})`;
    }
    return "Total Filtered Expenses";
  }, [hasActiveFilters, activeFilters]);

  const fetchData = useCallback(async () => {
    if (!userdetails?.id) return;
    
    try {
      setIsLoading(true);
      const [categoriesResponse, expensesResponse] = await Promise.all([
        fetchAllCategories(userdetails.id),
        fetchAllExpenses(userdetails.id),
      ]);
      setCategories(categoriesResponse);
      setExpenses(expensesResponse);
    } catch (error) {
      showAlert("Error", `Error fetching data! - ${error}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [userdetails?.id, showAlert]);

  const onRefresh = useCallback(async () => {
    if (!userdetails?.id) return;
    
    setRefreshing(true);
    try {
      const [categoriesResponse, expensesResponse] = await Promise.all([
        fetchAllCategories(userdetails.id),
        fetchAllExpenses(userdetails.id),
      ]);
      setCategories(categoriesResponse);
      setExpenses(expensesResponse);
    } finally {
      setRefreshing(false);
    }
  }, [userdetails?.id, showAlert]);

  // Handle viewing receipt images
  const handleViewReceipt = useCallback((receiptImageId) => {
    const imageUrl = getReceiptImageUrl(receiptImageId);
    if (imageUrl) {
      setSelectedReceiptImage(imageUrl);
      setReceiptImageModalVisible(true);
    } else {
      showAlert('Error', 'Failed to load receipt image', 'error');
    }
  }, [showAlert]);

  // Image download functionality for expense receipts
  const handleImageLongPress = useCallback((imageUri) => {
    setSelectedImageForDownload(imageUri);
    setShowDownloadModal(true);
  }, []);

  const downloadExpenseImage = useCallback(async () => {
    if (!selectedImageForDownload) return;

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
        return;
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `NaaApp_Receipt_${timestamp}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Handle base64 images vs URL images
      let downloadResult;
      if (selectedImageForDownload.startsWith('data:')) {
        // For base64 images, write directly to file
        const base64Data = selectedImageForDownload.split(',')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        downloadResult = { status: 200, uri: fileUri };
      } else {
        // For URL images, download normally
        downloadResult = await FileSystem.downloadAsync(selectedImageForDownload, fileUri);
      }

      if (downloadResult.status === 200) {
        // Save to media library without creating album (reduces permission prompts)
        await MediaLibrary.createAssetAsync(downloadResult.uri);

        showAlert(
          'Success',
          'Receipt image downloaded successfully to your gallery!',
          'success'
        );
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      showAlert(
        'Download Failed',
        'Could not download the receipt image. Please try again.',
        'error'
      );
    } finally {
      setShowDownloadModal(false);
      setSelectedImageForDownload(null);
    }
  }, [selectedImageForDownload, showAlert]);

  const cancelDownload = useCallback(() => {
    setShowDownloadModal(false);
    setSelectedImageForDownload(null);
  }, []);

  const addCategory = useCallback(async () => {
    if (!userdetails?.id) return;
    
    if (!newCategory.name.trim()) {
      showAlert("Validation Error", "Category name cannot be empty.", "error");
      return;
    }

    try {
      await addaCategory(newCategory, userdetails.id);
      setNewCategory({ name: "" });
      showAlert("Success", "Category added successfully!");
      setCategoryModalVisible(false);
      fetchData();
    } catch (error) {
      console.log("Error", error.message);
      showAlert("Error", `Failed to add category! ${error.message}`, "error");
    }
  }, [newCategory, userdetails?.id, fetchData, showAlert]);

  const addExpense = useCallback(async () => {
    if (!userdetails?.id) return;
    
    // Validate required fields
    if (
      !newExpense.amount ||
      !newExpense.description ||
      !newExpense.categoryId
    ) {
      showAlert(
        "Validation Error",
        "Please fill in all required fields.",
        "error"
      );
      return;
    }

    // Validate amount is a valid number
    const amountValue = parseFloat(newExpense.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      showAlert(
        "Validation Error",
        "Please enter a valid amount greater than 0.",
        "error"
      );
      return;
    }
    const expenseDate = newExpense.date ? new Date(newExpense.date) : null;
    const today = new Date();
    const expenseDateOnly = expenseDate ? new Date(
      expenseDate.getFullYear(),
      expenseDate.getMonth(),
      expenseDate.getDate()
    ) : null;
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    if (expenseDateOnly && expenseDateOnly > todayOnly) {
      showAlert(
        "Validation Error",
        "Date cannot be greater than today's date",
        "error"
      );
      return;
    }

    try {
      // Prepare expense data with proper amount conversion
      const expenseToAdd = {
        ...newExpense,
        amount: amountValue,
      };

      // Convert date to proper timestamp format for Supabase
      // If user selected a specific date, use current time with that date
      // If no date selected, use current timestamp
      let customDate = null;
      if (newExpense.date) {
        const selectedDate = new Date(newExpense.date);
        const now = new Date();
        // Set the selected date but keep current time
        selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        customDate = selectedDate.toISOString();
      }

      await addExpenses(expenseToAdd, userdetails.id, customDate);
      setNewExpense({
        amount: "",
        description: "",
        categoryId: "",
        date: new Date().toISOString().split("T")[0],
        receiptImage: null
      });
      setScannedImage(null);
      showAlert("Success", "Expense added successfully!", "success");
      setExpenseModalVisible(false);
      await fetchData();
    } catch (error) {
      console.log("Error in adding expense with image", error)
      showAlert("Error", `Failed to add expense! ${error.message}`, "error");
    }
  }, [newExpense, userdetails?.id, fetchData, showAlert]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;

    try {
      await deleteExpenseById(selectedItem.id);
      showAlert("Success", "Expense deleted successfully!", "success");
      setExpenseActionModalVisible(false);
      await fetchData();
    } catch (error) {
      showAlert("Error", "Failed to delete expense!", "error");
    } finally {
      setSelectedItem(null);
    }
  }, [selectedItem, fetchData, showAlert]);

  const handleDeleteAllAction = useCallback(async () => {
    // Use ref instead of state to get current selected items
    const currentSelectedItems = selectedItemsRef.current;

    // Check if selectedItems is empty (either null, undefined, empty array, or not an array)
    if (
      !currentSelectedItems ||
      !Array.isArray(currentSelectedItems) ||
      currentSelectedItems.length === 0
    ) {
      showAlert("Error", "Please select an entry to delete!", "error");
      setDeleteModalVisible(false);
      return;
    }

    try {
      await deleteAllExpensesById(currentSelectedItems);
      showAlert("Success", "Expenses deleted successfully!", "success");
      setDeleteModalVisible(false);
      setSelectedItems([]); // Clear selections after successful delete
      selectedItemsRef.current = []; // Clear ref as well
      await fetchData();
    } catch (error) {
      showAlert("Error", "Failed to delete the selected expenses!", "error");
    } finally {
      setDeleteModalVisible(false);
    }
  }, [fetchData, showAlert]);

  const handleLongPress = useCallback((item) => {
    setSelectedItem(item);
    setExpenseActionModalVisible(true);
  }, []);

  const handleDeletePress = useCallback((item) => {
    setSelectedItem(item);
    setExpenseActionModalVisible(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Toggle select all functionality
  const toggleSelectAll = useCallback(() => {
    const currentExpenses = hasActiveFilters ? filteredExpenses : expenses;

    if (selectAll) {
      setSelectedItems([]); // Deselect all
      selectedItemsRef.current = []; // Keep ref in sync
    } else {
      const allIds = currentExpenses.map((expense) => expense.id);
      setSelectedItems(allIds); // Select all expenses
      selectedItemsRef.current = allIds; // Keep ref in sync
    }
    setSelectAll(!selectAll);
  }, [selectAll, expenses, filteredExpenses, hasActiveFilters]);

  const handleSelectItem = useCallback((item) => {
    setSelectedItems((prevSelectedItems) => {
      const index = prevSelectedItems.indexOf(item.id);
      if (index === -1) {
        const newItems = [...prevSelectedItems, item.id];
        selectedItemsRef.current = newItems; // Keep ref in sync
        return newItems; // Add item to selection
      } else {
        const newItems = prevSelectedItems.filter((id) => id !== item.id);
        selectedItemsRef.current = newItems; // Keep ref in sync
        return newItems; // Remove item from selection
      }
    });
  }, []);

  // Apply filters when expenses change
  useEffect(() => {
    applyFilters(activeFilters);
  }, [expenses, applyFilters]);


  // Sync selectAll state with selectedItems
  useEffect(() => {
    const currentExpenses = hasActiveFilters ? filteredExpenses : expenses;
    if (currentExpenses.length > 0) {
      setSelectAll(selectedItems.length === currentExpenses.length);
    } else {
      setSelectAll(false);
    }
  }, [selectedItems.length, expenses.length, filteredExpenses.length, hasActiveFilters]);

  // Preserve selectedItems during data loading
  useEffect(() => {
    // Only clear selectedItems if expenses array changes significantly (not just during loading)
    if (expenses.length > 0 && selectedItems.length > 0) {
      // Filter out any selected items that no longer exist in the current expenses
      const validSelectedItems = selectedItems.filter(id =>
        expenses.some(expense => expense.id === id)
      );
      if (validSelectedItems.length !== selectedItems.length) {
        setSelectedItems(validSelectedItems);
      }
    }
  }, [expenses]);

  const handleDeleteAllExpenses = useCallback(() => {
    if (selectedItemsRef.current && selectedItemsRef.current.length > 0) {
      setDeleteAll(true);
      setDeleteModalVisible(true);
    } else {
      showAlert("Error", "Please select expenses to delete!", "error");
    }
  }, [showAlert]);

  const handleScanReceipt = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Camera access is required to scan receipts.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const imageUri = result.assets[0].uri;
      setScannedImage(imageUri);
      setIsLoading(true);

      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [
          { resize: { width: 800 } }, // Reduced from 1200 to prevent timeout
        ],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true } // Reduced quality
      );
      let parsedData = {};
      try {
        const ocrText = await processImageWithOCR(manipResult.base64);
        parsedData = parseOCRText(ocrText);
      } catch (ocrError) {
        showAlert('OCR Error', `Failed to process receipt: ${ocrError.message || ocrError}`, 'error');
        parsedData = {};
      }

      // Set up the form with OCR data or defaults
      const expenseData = {
        amount: parsedData.amount ? parseFloat(parsedData.amount).toString() : '',
        description: parsedData.description || (parsedData.amount ? 'Scanned Receipt' : 'Receipt (Manual Entry)'),
        date: parsedData.date || new Date().toISOString().split('T')[0],
        receiptImage: imageUri, // Attach the scanned receipt image
      };

      setNewExpense(prev => ({
        ...prev,
        ...expenseData
      }));

      setExpenseModalVisible(true);

      if (parsedData.amount) {
        showAlert('Success', `Receipt scanned successfully! Amount detected: Rs ${parsedData.amount}`);
      } else {
        showAlert('Info', 'Receipt captured. Please enter the amount manually.');
      }
    } catch (error) {
      console.error('=== RECEIPT SCAN ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      showAlert('Error', `Failed to scan receipt: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQRScan = (data, type) => {
    setQRScannerVisible(false);

    if (type === 'qr' && data.amount) {
      // Handle expense QR code
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) {
        showAlert('Error', 'Invalid amount in QR code');
        return;
      }

      const expenseData = {
        amount: amount.toString(),
        description: data.description || 'QR Code Expense',
        date: data.date || new Date().toISOString().split('T')[0],
        category: data.category || '', // Support category from QR code
      };

      setNewExpense(prev => ({
        ...prev,
        ...expenseData
      }));

      setExpenseModalVisible(true);
      showAlert('Success', `QR code scanned successfully! Amount: Rs ${amount}`);
    } else {
      // Handle other QR codes or text
      const content = data.rawData || JSON.stringify(data);
      showAlert('Info', `QR Code Content: ${content}`);
    }
  };

  const handleScanQRPress = () => {
    setQRScannerVisible(true);
  };

  const handleListCategories = () => {
    router.push('/(tabs)/(tracker)/categoryList');
  };

  const handleFilterPress = () => {
    setFilterModalVisible(true);
  };

  const handleCSVUpload = () => {
    setCSVUploaderVisible(true);
  };

  const handleCSVUploadComplete = async (processedExpenses) => {
    if (!userdetails?.id) return;
    
    setIsLoading(true);
    try {
      // If processedExpenses is empty, it means CSVUploader already handled the import
      if (processedExpenses.length === 0) {
        // Just refresh the data since import was already handled by CSVUploader
        await fetchData();
        setIsLoading(false);
        return;
      }

      // Legacy handling for when CSVUploader passes data to be imported here
      let successCount = 0;
      let errorCount = 0;

      for (const expense of processedExpenses) {
        try {
          await addExpenses(expense, userdetails.id);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Failed to add expense:', error);
        }
      }

      if (successCount > 0) {
        showAlert(
          "Import Complete",
          `Successfully imported ${successCount} expenses${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
          "success"
        );
        await fetchData(); // Refresh the expense list
      } else {
        showAlert("Import Failed", "No expenses were imported successfully", "error");
      }
    } catch (error) {
      showAlert("Error", "Failed to import expenses: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = useCallback((filters) => {
    setActiveFilters(filters);

    let filtered = [...expenses];

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(expense => expense.categories?.id === filters.category);
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.created_at);
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        return expenseDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.created_at);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        return expenseDate <= toDate;
      });
    }

    // Filter by amount range
    if (filters.amountMin) {
      const minAmount = parseFloat(filters.amountMin);
      if (!isNaN(minAmount)) {
        filtered = filtered.filter(expense => parseFloat(expense.amount) >= minAmount);
      }
    }

    if (filters.amountMax) {
      const maxAmount = parseFloat(filters.amountMax);
      if (!isNaN(maxAmount)) {
        filtered = filtered.filter(expense => parseFloat(expense.amount) <= maxAmount);
      }
    }

    setFilteredExpenses(filtered);
    const total = filtered.reduce((acc, expense) => {
      const amount = parseFloat(expense.amount);
      return acc + (isNaN(amount) ? 0 : amount);
    }, 0);
    setFilteredTotalAmount(total);
  }, [expenses]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return activeFilters.category ||
      activeFilters.dateFrom ||
      activeFilters.dateTo ||
      activeFilters.amountMin ||
      activeFilters.amountMax;
  }, [activeFilters]);

  const renderHeader = useCallback(
    () => (
      <>
        <HeaderButtons
          onAddExpense={() => setExpenseModalVisible(true)}
          onAddCategory={() => setCategoryModalVisible(true)}
          onListCategories={handleListCategories}
          onScanReceipt={handleScanReceipt}
          onScanQR={handleScanQRPress}
          onFilter={handleFilterPress}
          onCSVUpload={handleCSVUpload}
        />

        {/* Monthly Total Section - Properly Spaced */}
        <View className="mb-6 bg-gray-800/50 p-4 rounded-xl">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg text-cyan-100 font-plight">
              {hasActiveFilters ? getDateRangeText : "This Month Total Expense"}
            </Text>
            <Text className="text-xl text-cyan-100 font-psemibold">
              Rs {hasActiveFilters ? filteredTotalAmount.toFixed(2) : TotalExpenseForMonth.toFixed(2)}
            </Text>
          </View>
        </View>
        <View className="mb-6">
          <Text className="text-xl text-cyan-100 font-plight mb-2">
            Category
          </Text>
          <CategoriesList
            categories={categories}
            categoryTotals={categoryTotals}
          />
        </View>

        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <Text className="text-xl text-cyan-100 font-plight">
              {hasActiveFilters ? 'Filtered Expenses' : 'Recent Expenses'}
            </Text>
            {hasActiveFilters && (
              <View className="ml-2 bg-purple-500 px-2 py-1 rounded-full">
                <Text className="text-white text-xs font-pmedium">
                  {filteredExpenses.length}
                </Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={toggleSelectAll}>
              <MaterialIcons
                name={selectAll ? "check-box" : "check-box-outline-blank"}
                size={24}
                color="#e0f2fe"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteAllExpenses}>
              <MaterialIcons name="delete" size={24} color="red" />
            </TouchableOpacity>
          </View>
        </View>

        {(hasActiveFilters ? filteredExpenses : expenses).length === 0 && (
          <Text className="text-xl text-cyan-100 font-psemibold mb-2">
            {hasActiveFilters ? 'No expenses match the current filters.' : 'No expenses found.'}
          </Text>
        )}

        {hasActiveFilters && (
          <TouchableOpacity
            onPress={() => applyFilters({
              category: '',
              dateFrom: null,
              dateTo: null,
              amountMin: '',
              amountMax: '',
            })}
            className="flex-row items-center justify-center mb-2 bg-gray-200 py-2 px-4 rounded-lg"
          >
            <MaterialIcons name="clear" size={16} color="#6B7280" />
            <Text className="text-gray-600 ml-1 font-pmedium">Clear All Filters</Text>
          </TouchableOpacity>
        )}
      </>
    ),
    [categories, categoryTotals, expenses.length, selectAll, toggleSelectAll, hasActiveFilters, filteredExpenses.length, filteredTotalAmount, getDateRangeText]
  );

  // Memoized Search Input Component
  const SearchInput = memo(({ value, onChange }) => (
    <TextInput
      placeholder="Filter expenses by month..."
      value={value}
      onChangeText={onChange}
      style={{ padding: 10, borderWidth: 1, margin: 10 }}
    />
  ));

  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
  }, []);

  const displayExpenses = useMemo(() => {
    const expensesToShow = hasActiveFilters ? filteredExpenses : expenses;
    const sortedExpenses = [...expensesToShow].sort((a, b) => {
      // Use created_at from Supabase
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA; // Most recent first
    });

    // Only limit to 10 when no filters are active
    return hasActiveFilters ? sortedExpenses : sortedExpenses.slice(0, 10);
  }, [expenses, filteredExpenses, hasActiveFilters]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-pink-900">
        <ActivityIndicator size="large" color="#5C94C8" />
        <Text className="text-white mt-4">Loading expenses...</Text>
      </View>
    );
  }
  return (
    <View className="flex-1 p-4">

      {alert && (
        <FancyAlert
          isVisible={alert.visible}
          onClose={() => showAlert((prev) => ({ ...prev, visible: false }))}
          title={alert.title}
          message={alert.message}
          variant={alert.type}
          autoClose={true}
          autoCloseTime={3000}
        />
      )}

      <FlatList
        data={displayExpenses}
        renderItem={({ item }) => (
          <ExpenseItem
            item={item}
            onLongPress={handleLongPress}
            isSelected={selectedItems.includes(item.id)}
            onSelect={handleSelectItem}
            onDelete={handleDeletePress}
            onViewReceipt={handleViewReceipt}
          />
        )}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyExtractor={(item) => item?.id}
      />

      <AddExpenseModal
        visible={isExpenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        onAdd={addExpense}
        categories={categories}
        expense={newExpense}
        setExpense={setNewExpense}
        scannedImage={scannedImage}
        handleImageSelected={handleImageSelected}
      />


      <CustomModal
        modalVisible={isCategoryModalVisible}
        onSecondaryPress={() => setCategoryModalVisible(false)}
        title="Add Category"
        primaryButtonText="Add"
        secondaryButtonText="Cancel"
        onPrimaryPress={addCategory}
      >
        <View className="w-full">
          <FormFields
            placeholder="Category Name"
            value={newCategory.name || ""}
            inputfieldcolor="bg-gray-200"
            textcolor="text-gray-800"
            bordercolor="border-gray-400"
            handleChangeText={(text) =>
              setNewCategory({ ...newCategory, name: text })
            }
            otherStyles="mb-4"
          />
        </View>
      </CustomModal>

      <CustomModal
        title="Are you sure you want to delete this entry?"
        modalVisible={isExpenseActionModalVisible}
        primaryButtonText="Delete"
        onPrimaryPress={handleDelete}
        onSecondaryPress={() => setExpenseActionModalVisible(false)}
      />
      <CustomModal
        title={`Delete ${selectedItemsRef.current?.length || 0} Selected Expense${selectedItemsRef.current?.length === 1 ? '' : 's'}?`}
        modalVisible={isDeleteModalVisible}
        primaryButtonText="Delete"
        onPrimaryPress={handleDeleteAllAction}
        onSecondaryPress={() => setDeleteModalVisible(false)}
      >
        <Text className="text-base text-center text-gray-600 mb-4">
          {hasActiveFilters
            ? `You are about to delete ${selectedItemsRef.current?.length || 0} filtered expense${selectedItemsRef.current?.length === 1 ? '' : 's'}. This action cannot be undone.`
            : `You are about to delete ${selectedItemsRef.current?.length || 0} expense${selectedItemsRef.current?.length === 1 ? '' : 's'}. This action cannot be undone.`
          }
        </Text>
      </CustomModal>

      <QRScanner
        visible={isQRScannerVisible}
        onClose={() => setQRScannerVisible(false)}
        onScan={handleQRScan}
      />

      {/* Receipt Image Modal */}
      <CustomModal
        modalVisible={isReceiptImageModalVisible}
        onSecondaryPress={() => {
          setReceiptImageModalVisible(false);
          setSelectedReceiptImage(null);
        }}
        title="Receipt Image"
        secondaryButtonText="Close"
        showPrimaryButton={false}
      >
        <View className="w-full items-center">
          <Text className="text-sm text-gray-600 mb-2">
            Image URL: {selectedReceiptImage ? 'Available' : 'None'}
          </Text>
          {selectedReceiptImage ? (
            <Pressable
              onLongPress={() => handleImageLongPress(selectedReceiptImage)}
              delayLongPress={500}
            >
              <Image
                source={{ uri: selectedReceiptImage }}
                style={{
                  width: 300,
                  height: 400,
                  borderRadius: 8,
                  resizeMode: 'contain'
                }}
              />
            </Pressable>
          ) : (
            <Text className="text-red-500">No image URL available</Text>
          )}
          {selectedReceiptImage && (
            <Text className="text-xs text-gray-500 mt-2 text-center">
              Long press image to download
            </Text>
          )}
        </View>
      </CustomModal>

      {/* Download Confirmation Modal */}
      <CustomModal
        title="Download Receipt Image"
        modalVisible={showDownloadModal}
        primaryButtonText="Download"
        secondaryButtonText="Cancel"
        onPrimaryPress={downloadExpenseImage}
        onSecondaryPress={cancelDownload}
      >
        <Text className="text-base text-center text-gray-600 mb-4">
          Do you want to download this receipt image to your gallery?
        </Text>
      </CustomModal>

      {/* Filter Modal */}
      <ExpenseFilter
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApplyFilters={applyFilters}
        categories={categories}
        currentFilters={activeFilters}
      />

      {/* CSV Uploader Modal */}
      <CSVUploader
        visible={isCSVUploaderVisible}
        onClose={() => setCSVUploaderVisible(false)}
        onUploadComplete={handleCSVUploadComplete}
        categories={categories}
        userId={userdetails?.id}
      />
    </View>
  );
};

export default memo(ExpenseTracker);
