import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { getBudgets, createBudget, updateBudget, deleteBudget, getBudgetSpending } from '../lib/APIs/BudgetApiSupabase';
import { useGlobalContext } from '../context/GlobalProvider';
import useAlertContext from '../context/AlertProvider';
import CustomButton from './CustomButton';
import CustomModal from './CustomModal';
import FormFields from './FormFields';

const BudgetTracker = ({ categories = [] }) => {
  const [budgets, setBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetForm, setBudgetForm] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly', // monthly, weekly, yearly
    name: ''
  });
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const { userdetails } = useGlobalContext();
  const { showAlert } = useAlertContext();

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      setIsLoading(true);
      const budgetData = await getBudgets(userdetails.id);
      
      // Get spending data for each budget
      const budgetsWithSpending = await Promise.all(
        budgetData.map(async (budget) => {
          const spending = await getBudgetSpending(budget.id, userdetails.id);
          return { ...budget, currentSpending: spending };
        })
      );
      
      setBudgets(budgetsWithSpending);
    } catch (error) {
      showAlert('Error', 'Failed to load budgets', 'error');
      console.error('Load budgets error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    if (!budgetForm.name || !budgetForm.amount || !budgetForm.categoryId) {
      showAlert('Validation Error', 'Please fill in all fields', 'warning');
      return;
    }

    try {
      const budgetData = {
        name: budgetForm.name,
        category_id: budgetForm.categoryId,
        amount: parseFloat(budgetForm.amount),
        period: budgetForm.period,
        user_id: userdetails.id
      };

      if (editingBudget) {
        await updateBudget(editingBudget.id, budgetData);
        showAlert('Success', 'Budget updated successfully', 'success');
      } else {
        await createBudget(budgetData);
        showAlert('Success', 'Budget created successfully', 'success');
      }

      setShowAddModal(false);
      setEditingBudget(null);
      setBudgetForm({ categoryId: '', amount: '', period: 'monthly', name: '' });
      loadBudgets();
    } catch (error) {
      showAlert('Error', 'Failed to save budget', 'error');
      console.error('Save budget error:', error);
    }
  };

  const handleDeleteBudget = (budget) => {
    setBudgetToDelete(budget);
    setDeleteModalVisible(true);
  };

  const confirmDeleteBudget = async () => {
    if (!budgetToDelete) return;
    
    try {
      await deleteBudget(budgetToDelete.id);
      showAlert('Success', 'Budget deleted successfully', 'success');
      loadBudgets();
    } catch (error) {
      showAlert('Error', 'Failed to delete budget', 'error');
    } finally {
      setDeleteModalVisible(false);
      setBudgetToDelete(null);
    }
  };

  const cancelDeleteBudget = () => {
    setDeleteModalVisible(false);
    setBudgetToDelete(null);
  };

  const openEditModal = (budget) => {
    setEditingBudget(budget);
    setBudgetForm({
      categoryId: budget.category_id,
      amount: budget.amount.toString(),
      period: budget.period,
      name: budget.name
    });
    setShowAddModal(true);
  };

  const getProgressPercentage = (spent, budget) => {
    return Math.min((spent / budget) * 100, 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return ['#ef4444', '#dc2626']; // Red
    if (percentage >= 80) return ['#f59e0b', '#d97706']; // Orange
    if (percentage >= 60) return ['#eab308', '#ca8a04']; // Yellow
    return ['#10b981', '#059669']; // Green
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const BudgetCard = ({ budget }) => {
    const percentage = getProgressPercentage(budget.currentSpending, budget.amount);
    const progressColors = getProgressColor(percentage);
    const isOverBudget = percentage >= 100;

    return (
      <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="text-lg font-pbold text-gray-800">{budget.name}</Text>
            <Text className="text-sm font-pregular text-gray-600">
              {categories.find(c => c.id === budget.category_id)?.category_name || 'Unknown Category'}
            </Text>
            <Text className="text-xs font-pregular text-gray-500 capitalize">
              {budget.period} Budget
            </Text>
          </View>
          <View className="flex-row space-x-2">
            <TouchableOpacity onPress={() => openEditModal(budget)}>
              <MaterialIcons name="edit" size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteBudget(budget)}>
              <MaterialIcons name="delete" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-pmedium text-gray-700">
              {formatCurrency(budget.currentSpending)} of {formatCurrency(budget.amount)}
            </Text>
            <Text className={`text-sm font-pbold ${isOverBudget ? 'text-red-600' : 'text-gray-600'}`}>
              {percentage.toFixed(0)}%
            </Text>
          </View>
          
          <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <LinearGradient
              colors={progressColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: `${Math.min(percentage, 100)}%`,
                height: '100%',
              }}
            />
          </View>
        </View>

        {isOverBudget && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-2">
            <Text className="text-red-800 text-xs font-pmedium text-center">
              ⚠️ Over budget by {formatCurrency(budget.currentSpending - budget.amount)}
            </Text>
          </View>
        )}

        {!isOverBudget && (
          <Text className="text-green-600 text-xs font-pmedium text-center">
            {formatCurrency(budget.amount - budget.currentSpending)} remaining
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-pink-900">
      {/* Header */}
      <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 mt-5 mb-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl text-cyan-100 font-pbold text-center flex-1">
            Budget Tracker
          </Text>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            className="bg-cyan-100 rounded-full p-2 ml-3"
          >
            <MaterialIcons name="add" size={20} color="#7C1F4E" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView className="flex-1 p-4">

        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-cyan-100 font-pregular">Loading budgets...</Text>
          </View>
        ) : budgets.length > 0 ? (
          budgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} />
          ))
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <MaterialIcons name="account-balance-wallet" size={64} color="#a5b4fc" />
            <Text className="text-cyan-100 font-pmedium text-lg mt-4">No budgets yet</Text>
            <Text className="text-cyan-200 font-pregular text-sm mt-2 text-center">
              Create your first budget to start tracking your spending
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Budget Modal */}
      <CustomModal
        modalVisible={showAddModal}
        onSecondaryPress={() => {
          setShowAddModal(false);
          setEditingBudget(null);
          setBudgetForm({ categoryId: '', amount: '', period: 'monthly', name: '' });
        }}
        title={editingBudget ? 'Edit Budget' : 'Create Budget'}
        primaryButtonText={editingBudget ? 'Update' : 'Create'}
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSaveBudget}
      >
        <View className="w-full">
          <FormFields
            placeholder="Budget Name"
            value={budgetForm.name}
            inputfieldcolor="bg-gray-200"
            textcolor="text-gray-800"
            bordercolor="border-gray-400"
            handleChangeText={(text) => setBudgetForm({ ...budgetForm, name: text })}
            otherStyles="mb-4"
          />

          <FormFields
            placeholder="Budget Amount"
            value={budgetForm.amount}
            inputfieldcolor="bg-gray-200"
            textcolor="text-gray-800"
            bordercolor="border-gray-400"
            handleChangeText={(text) => setBudgetForm({ ...budgetForm, amount: text })}
            otherStyles="mb-4"
            inputProps={{ keyboardType: "numeric" }}
          />

          <View className="border rounded-2xl overflow-hidden mb-4 w-full border-gray-400">
            <Picker
              useNativeAndroidPickerStyle={false}
              selectedValue={budgetForm.categoryId}
              onValueChange={(itemValue) =>
                setBudgetForm({ ...budgetForm, categoryId: itemValue })
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
                  key={category.id}
                  label={category.category_name}
                  value={category.id}
                />
              ))}
            </Picker>
          </View>

          <View className="border rounded-2xl overflow-hidden mb-4 w-full border-gray-400 bg-gray-200">
            <View className="flex-row p-2">
              {['weekly', 'monthly', 'yearly'].map((period) => (
                <TouchableOpacity
                  key={period}
                  onPress={() => setBudgetForm({ ...budgetForm, period })}
                  className={`flex-1 py-3 rounded-xl mx-1 ${
                    budgetForm.period === period
                      ? 'bg-[#7C1F4E]'
                      : 'bg-white border border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-center font-pmedium capitalize ${
                      budgetForm.period === period ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <CustomModal
        title="Delete Budget"
        modalVisible={isDeleteModalVisible}
        primaryButtonText="Delete"
        secondaryButtonText="Cancel"
        onPrimaryPress={confirmDeleteBudget}
        onSecondaryPress={cancelDeleteBudget}
      >
        <View className="px-2">
          <Text className="text-gray-800 text-base font-pmedium mb-2 text-center leading-6">
            Are you sure you want to delete{'\n'}
            <Text className="font-psemibold text-red-600">"{budgetToDelete?.name}"</Text>?
          </Text>
          <Text className="text-gray-500 text-sm font-pregular mb-2 text-center">
            This action cannot be undone.
          </Text>
        </View>
      </CustomModal>
    </SafeAreaView>
  );
};

export default BudgetTracker;
