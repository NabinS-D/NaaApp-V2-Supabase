import React, { useState, useEffect, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, Text, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchAllExpenses } from '../lib/APIs/ExpenseApiSupabase';
import { useGlobalContext } from '../context/GlobalProvider';
import useAlertContext from '../context/AlertProvider';

const ExpenseSearch = ({ onClose, categories = [], expenses = [], onSearchResults }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const { userdetails } = useGlobalContext();
  const { showAlert } = useAlertContext();

  // Manual search function
  const performSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    const results = expenses.filter(expense => {
      // Search in description (partial match)
      const descriptionMatch = expense.description?.toLowerCase().includes(query);
      
      // Search in amount (partial match)
      const amountMatch = expense.amount?.toString().includes(query);
      
      // Search in category name (partial match)
      const categoryMatch = expense.categories?.category_name?.toLowerCase().includes(query);
      
      // Search in formatted date (partial match)
      const expenseDate = new Date(expense.created_at);
      const formattedDate = expenseDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric', 
        year: 'numeric'
      }).toLowerCase();
      const dateMatch = formattedDate.includes(query);
      
      // Return true if any field matches
      return descriptionMatch || amountMatch || categoryMatch || dateMatch;
    });
    
    setSearchResults(results);
    if (onSearchResults) {
      onSearchResults(results);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (onSearchResults) {
      onSearchResults([]);
    }
  };

  const renderExpenseItem = ({ item }) => {
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
      <View className="bg-white p-4 rounded-lg mb-2 flex-row justify-between items-center">
        <View className="flex-1 mr-2">
          <Text className="font-pmedium" numberOfLines={2} ellipsizeMode="tail">
            {item.description}
          </Text>
          <Text className="text-gray-500 text-xs mt-1">
            {item.categories?.category_name || 'No Category'}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-lg font-psemibold">
            Rs {parseFloat(item.amount).toFixed(2)}
          </Text>
          <Text className="text-gray-500 text-xs">{formatDate(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View>
      {/* Search Input Only */}
      <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3">
        <TextInput
          className="flex-1 text-base font-pregular text-cyan-100"
          placeholder="Search expenses, categories, amounts..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={performSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} className="ml-2 p-1">
            <MaterialIcons name="clear" size={20} color="#e0f2fe" />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={performSearch}
          className="ml-2 bg-[#7C1F4E] p-2 rounded-lg items-center justify-center"
        >
          <MaterialIcons name="search" size={20} color="#e0f2fe" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ExpenseSearch;
