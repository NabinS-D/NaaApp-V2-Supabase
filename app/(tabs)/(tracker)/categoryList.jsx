import { RefreshControl, ScrollView, Text, View, ActivityIndicator, TouchableOpacity } from "react-native";
import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "../../../context/GlobalProvider.js";
import CustomButton from "../../../components/CustomButton.jsx";
import CustomModal from "../../../components/CustomModal.jsx";
import FormFields from "../../../components/FormFields.jsx";
import {
  categoryByID,
  deleteCategoryByID,
  deleteCategoryWithExpenses,
  fetchAllCategories,
  handleEditCategory,
} from "../../../lib/APIs/CategoryApiSupabase.js";
import { expensesOfCategory } from "../../../lib/APIs/ExpenseApiSupabase.js";
import useAlertContext from "../../../context/AlertProvider.js";
import ExportData from '../../../components/ExportData';

// Memoized Header Component
const Header = memo(({ onExportStart, onExportComplete, categories = [], showAlert }) => {
  // Prepare data for export
  const exportData = useMemo(() =>
    categories.map(category => ({
      name: category.category_name || 'Unnamed Category',
      expenseCount: category.expenseCount || 0,
      totalAmount: parseFloat(category.totalAmount || 0).toFixed(2)
    })),
    [categories]
  );

  return (
    <View className="flex-row justify-between items-center bg-pink-700 rounded-lg py-4 px-4">
      <Text className="text-2xl text-cyan-100 font-pbold">
        Available Categories
      </Text>
      <ExportData
        data={exportData}
        columns={[
          { key: 'name', header: 'Category Name' },
          { key: 'expenseCount', header: 'Expense Count' },
          { key: 'totalAmount', header: 'Total Amount (Rs)' }
        ]}
        title="Categories"
        buttonStyle={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          padding: 8,
          borderRadius: 8,
          minWidth: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center'
        }}
        iconSize={20}
        iconColor="#fff"
        onExportStart={onExportStart}
        onExportComplete={onExportComplete}
        onError={(error) => showAlert('Error', error.message, 'error')}
        showAlert={showAlert}
      />
    </View>
  );
});

// Memoized Category Item Component
const CategoryItem = memo(({ category, onEdit, onDelete, onPress }) => {
  if (!category) return null;

  return (
    <TouchableOpacity 
      className="flex-row items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-2"
      onPress={() => onPress(category)}
      activeOpacity={0.7}
    >
      <Text
        className="flex-1 text-gray-800 text-lg font-medium pr-2"
        numberOfLines={1}
      >
        {category.category_name}
      </Text>

      <View className="flex-row gap-x-2">
        <CustomButton
          title="Edit"
          containerStyles="rounded-md bg-blue-500 px-3 w-[60px]"
          textStyles="text-white text-sm font-medium"
          handlePress={() => onEdit(category.id)}
          buttoncolor="bg-blue-500"
          fullWidth={false}
        />
        <CustomButton
          title="Delete"
          containerStyles="rounded-md bg-red-500 px-3 w-[70px]"
          textStyles="text-white text-sm font-medium"
          handlePress={() => onDelete(category.id)}
          buttoncolor="bg-red-500"
          fullWidth={false}
        />
      </View>
    </TouchableOpacity>
  );
});

// Memoized Edit Modal Component
const EditModal = memo(
  ({ visible, onClose, onEdit, category, onCategoryChange }) => {
    return (
      <CustomModal
        modalVisible={visible}
        onSecondaryPress={onClose}
        title="Edit Category"
        primaryButtonText="Edit"
        secondaryButtonText="Cancel"
        onPrimaryPress={onEdit}
      >
        <View className="w-full">
          <FormFields
            title="Category Name"
            placeholder="Category Name"
            value={category.categoryname}
            inputfieldcolor="bg-gray-200" // Light gray background
            textcolor="text-gray-800" // Darker text
            bordercolor="border-gray-400" // Gray border
            handleChangeText={(text) =>
              onCategoryChange((prev) => ({
                ...prev,
                categoryname: text,
              }))
            }
          />
        </View>
      </CustomModal>
    );
  }
);

// Memoized Delete Modal Component
const DeleteModal = memo(({ visible, onClose, onDelete, expenseCount }) => (
  <CustomModal
    modalVisible={visible}
    onSecondaryPress={onClose}
    title="Delete Category"
    primaryButtonText="Delete"
    secondaryButtonText="Cancel"
    onPrimaryPress={onDelete}
  >
    <View>
      <Text className="font-pmedium mb-2">
        {expenseCount > 0
          ? `Are you sure you want to delete this category and its ${expenseCount} related expense${expenseCount > 1 ? 's' : ''}?`
          : "Are you sure you want to delete this category?"
        }
      </Text>
    </View>
  </CustomModal>
));

// Memoized Detail Modal Component
const DetailModal = memo(({ visible, onClose, category }) => {
  if (!category) return null;

  return (
    <CustomModal
      modalVisible={visible}
      onSecondaryPress={onClose}
      title="Category Details"
      primaryButtonText="Close"
      secondaryButtonText=""
      onPrimaryPress={onClose}
      showSecondaryButton={false}
    >
      <View className="w-full">
        <View className="mb-4">
          <Text className="text-gray-600 text-sm mb-1">Category Name</Text>
          <Text className="text-gray-800 text-lg font-bold">{category.category_name}</Text>
        </View>
        <View className="flex-row justify-between mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-gray-600 text-sm mb-1">Expense Count</Text>
            <Text className="text-gray-800 text-lg font-bold">{category.expenseCount || 0}</Text>
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-gray-600 text-sm mb-1">Total Amount</Text>
            <Text className="text-gray-800 text-lg font-bold">Rs {category.totalAmount || '0.00'}</Text>
          </View>
        </View>
      </View>
    </CustomModal>
  );
});

const CategoryList = () => {
  const { userdetails } = useGlobalContext();
  const { showAlert } = useAlertContext();
  const [categories, setCategories] = useState([]);
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [newCategory, setNewCategory] = useState({
    categoryname: "",
    categoryId: "",
  });
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const [expenseCount, setExpenseCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Memoized fetch categories function
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const categories = await fetchAllCategories(userdetails.id);
      // Add expense data to each category
      const categoriesWithExpenses = await Promise.all(
        categories.map(async (category) => {
          const expenses = await expensesOfCategory(category.id);
          const totalAmount = expenses.reduce(
            (sum, exp) => sum + parseFloat(exp.amount || 0),
            0
          );
          return {
            ...category,
            expenseCount: expenses.length,
            totalAmount: totalAmount.toFixed(2),
          };
        })
      );
      setCategories(categoriesWithExpenses);
    } catch (error) {
      showAlert("Error", `Failed to fetch categories: ${error.message}`, "error");
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [userdetails.id]);

  // Memoized refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchCategories();
    } catch (error) {
      showAlert("Error", "Failed to refresh categories", "error");
    } finally {
      setRefreshing(false);
    }
  }, [fetchCategories]);

  // Memoized edit handler
  const handleEdit = useCallback(async (categoryId) => {
    try {
      setIsEditVisible(true);
      const data = await categoryByID(categoryId);
      if (data) {
        setNewCategory({
          categoryId: categoryId,
          categoryname: data.category_name,
        });
      }
    } catch (error) {
      showAlert("Error", "Failed to fetch category details", "error");
    }
  }, []);

  // Memoized edit submission handler
  const editCategory = useCallback(async () => {
    if (!newCategory.categoryname || newCategory.categoryname.trim() === "") {
      showAlert("Error", "Category cannot be empty", "error");
      return null;
    }
    try {
      await handleEditCategory(
        newCategory.categoryId,
        newCategory.categoryname
      );
      showAlert("Success", "Category updated successfully", "success");
      setIsEditVisible(false);
      await fetchCategories();
    } catch (error) {
      showAlert("Error", "Failed to update category", "error");
    }
  }, [newCategory, fetchCategories]);

  // Memoized delete handler with cascade deletion
  const handleDelete = useCallback(
    async (categoryId) => {
      try {
        const result = await deleteCategoryWithExpenses(categoryId);
        if (result.success) {
          const message = result.deletedExpenses > 0
            ? `Category deleted successfully along with ${result.deletedExpenses} related expense(s)`
            : "Category deleted successfully";
          showAlert("Success", message, "success");
          setIsDeleteVisible(false);
          await fetchCategories();
        }
      } catch (error) {
        showAlert("Error", `Failed to delete category: ${error.message}`, "error");
      }
    },
    [fetchCategories]
  );

  // Effect for initial fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Memoized refresh control
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor="#fff"
        titleColor="#fff"
      />
    ),
    [refreshing, onRefresh]
  );

  const handleExportStart = useCallback(() => {
    setIsExporting(true);
  }, []);

  const handleExportComplete = useCallback(() => {
    setIsExporting(false);
  }, []);

  const handleDetailPress = useCallback((category) => {
    setSelectedCategory(category);
    setIsDetailVisible(true);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#7C1F4E", paddingTop: 20 }}>
      <View className="mx-4">
        <Header
          categories={categories}
          onExportStart={handleExportStart}
          onExportComplete={handleExportComplete}
          showAlert={showAlert}
        />
      </View>
      {isLoading || isExporting ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5C94C8" />
          {isExporting && (
            <Text className="text-white mt-2">Exporting data, please wait...</Text>
          )}
        </View>
      ) : (
        <ScrollView className="flex-1" refreshControl={refreshControl}>
          <View className="px-4 mt-4">
            {categories?.length > 0 ? (
              categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  onEdit={handleEdit}
                  onPress={handleDetailPress}
                  onDelete={async (id) => {
                    setCurrentCategoryId(id);
                    // Check for related expenses before showing delete modal
                    try {
                      const categoryExpenses = await expensesOfCategory(id);
                      setExpenseCount(categoryExpenses.length);
                      setIsDeleteVisible(true);
                    } catch (error) {
                      showAlert("Error", "Failed to check category expenses", "error");
                    }
                  }}
                />
              ))
            ) : (
              <Text className="text-cyan-100 font-pbold text-lg text-center mt-4">
                No categories found.
              </Text>
            )}
          </View>

          <EditModal
            visible={isEditVisible}
            onClose={() => setIsEditVisible(false)}
            onEdit={editCategory}
            category={newCategory}
            onCategoryChange={setNewCategory}
          />

          <DeleteModal
            visible={isDeleteVisible}
            onClose={() => setIsDeleteVisible(false)}
            onDelete={() => handleDelete(currentCategoryId)}
            expenseCount={expenseCount}
          />

          <DetailModal
            visible={isDetailVisible}
            onClose={() => setIsDetailVisible(false)}
            category={selectedCategory}
          />
        </ScrollView>
      )}
    </View>
  );
};

export default memo(CategoryList);
