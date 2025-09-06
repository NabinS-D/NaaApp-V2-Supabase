import React, { useState, useEffect, memo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomButton from './CustomButton';

const ExpenseFilter = memo(({
    visible,
    onClose,
    onApplyFilters,
    categories,
    currentFilters
}) => {
    const [filters, setFilters] = useState({
        category: '',
        dateFrom: '',
        dateTo: '',
        amountMin: '',
        amountMax: '',
        ...currentFilters
    });

    const [showValidationError, setShowValidationError] = useState(false);
    const [showDateFromPicker, setShowDateFromPicker] = useState(false);
    const [showDateToPicker, setShowDateToPicker] = useState(false);


    // Reset filters to current when modal opens
    useEffect(() => {
        if (visible) {
            setFilters({
                category: '',
                dateFrom: '',
                dateTo: '',
                amountMin: '',
                amountMax: '',
                ...currentFilters
            });
        }
    }, [visible, currentFilters]);

    const handleApplyFilters = () => {
        // Check if at least one filter is set
        const hasFilters = filters.category ||
            filters.dateFrom ||
            filters.dateTo ||
            filters.amountMin ||
            filters.amountMax;

        if (!hasFilters) {
            setShowValidationError(true);
            return;
        }

        // Validate and convert dates
        const dateFromObj = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const dateToObj = filters.dateTo ? new Date(filters.dateTo) : null;

        // Validate date range
        if (dateFromObj && dateToObj && dateFromObj > dateToObj) {
            alert('Start date cannot be after end date');
            return;
        }

        // Validate date format
        if (filters.dateFrom && isNaN(dateFromObj)) {
            alert('Please enter a valid start date in YYYY-MM-DD format');
            return;
        }

        if (filters.dateTo && isNaN(dateToObj)) {
            alert('Please enter a valid end date in YYYY-MM-DD format');
            return;
        }

        // Validate amount range
        const minAmount = parseFloat(filters.amountMin);
        const maxAmount = parseFloat(filters.amountMax);

        if (filters.amountMin && filters.amountMax && minAmount > maxAmount) {
            alert('Minimum amount cannot be greater than maximum amount');
            return;
        }

        // Convert to the format expected by the parent component
        const filtersToApply = {
            ...filters,
            dateFrom: dateFromObj,
            dateTo: dateToObj
        };

        onApplyFilters(filtersToApply);
        onClose();
    };

    const handleClearFilters = () => {
        const clearedFilters = {
            category: '',
            dateFrom: '',
            dateTo: '',
            amountMin: '',
            amountMax: '',
        };
        setFilters(clearedFilters);
        // Convert to the format expected by the parent component
        const filtersToApply = {
            ...clearedFilters,
            dateFrom: null,
            dateTo: null
        };
        onApplyFilters(filtersToApply);
        onClose();
    };

    const formatDateForInput = (date) => {
        if (!date) return '';
        // Handle both string and Date object inputs
        if (typeof date === 'string') return date;
        return date.toISOString().split('T')[0];
    };

    const isValidDateString = (dateString) => {
        if (!dateString) return true; // Empty string is valid (no filter)
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    };

    const handleDateFromChange = (event, selectedDate) => {
        setShowDateFromPicker(Platform.OS === 'ios');
        if (selectedDate) {
            const dateString = selectedDate.toISOString().split('T')[0];
            setFilters(prev => ({ ...prev, dateFrom: dateString }));
        }
    };

    const handleDateToChange = (event, selectedDate) => {
        setShowDateToPicker(Platform.OS === 'ios');
        if (selectedDate) {
            const dateString = selectedDate.toISOString().split('T')[0];
            setFilters(prev => ({ ...prev, dateTo: dateString }));
        }
    };

    const showDateFromPickerModal = () => {
        setShowDateFromPicker(true);
    };

    const showDateToPickerModal = () => {
        setShowDateToPicker(true);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white rounded-lg p-6 w-11/12 max-h-5/6">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-psemibold text-gray-800">Filter Expenses</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialIcons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Category Filter */}
                        <View className="mb-4">
                            <Text className="text-base font-pmedium text-gray-700 mb-2">Category</Text>
                            <View className="border border-gray-300 rounded-lg overflow-hidden">
                                <Picker
                                    selectedValue={filters.category}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                                    style={{ backgroundColor: '#F9FAFB' }}
                                >
                                    <Picker.Item label="All Categories" value="" />
                                    {categories.map((category) => (
                                        <Picker.Item
                                            key={category.id}
                                            label={category.category_name}
                                            value={category.id}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        {/* Date Range Filter */}
                        <View className="mb-4">
                            <Text className="text-base font-pmedium text-gray-700 mb-2">Date Range</Text>

                            {/* Date From */}
                            <View className="mb-2">
                                <Text className="text-sm text-gray-600 mb-1">From</Text>
                                <TouchableOpacity
                                    onPress={showDateFromPickerModal}
                                    className="border border-gray-300 rounded-lg p-3 bg-gray-50 flex-row items-center justify-between"
                                >
                                    <Text className={`text-gray-700 ${!filters.dateFrom ? 'text-gray-400' : ''}`}>
                                        {formatDateForInput(filters.dateFrom) || 'Select start date'}
                                    </Text>
                                    <MaterialIcons name="date-range" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showDateFromPicker && (
                                    <DateTimePicker
                                        value={filters.dateFrom ? new Date(filters.dateFrom) : new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleDateFromChange}
                                        maximumDate={new Date()}
                                    />
                                )}
                            </View>

                            {/* Date To */}
                            <View className="mb-2">
                                <Text className="text-sm text-gray-600 mb-1">To</Text>
                                <TouchableOpacity
                                    onPress={showDateToPickerModal}
                                    className="border border-gray-300 rounded-lg p-3 bg-gray-50 flex-row items-center justify-between"
                                >
                                    <Text className={`text-gray-700 ${!filters.dateTo ? 'text-gray-400' : ''}`}>
                                        {formatDateForInput(filters.dateTo) || 'Select end date'}
                                    </Text>
                                    <MaterialIcons name="date-range" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showDateToPicker && (
                                    <DateTimePicker
                                        value={filters.dateTo ? new Date(filters.dateTo) : new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleDateToChange}
                                        maximumDate={new Date()}
                                        minimumDate={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                                    />
                                )}
                            </View>

                            {/* Clear Date Range */}
                            {(filters.dateFrom || filters.dateTo) && (
                                <TouchableOpacity
                                    onPress={() => setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }))}
                                    className="flex-row items-center justify-center mt-1"
                                >
                                    <MaterialIcons name="clear" size={16} color="#EF4444" />
                                    <Text className="text-red-500 text-sm ml-1">Clear Date Range</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Amount Range Filter */}
                        <View className="mb-6">
                            <Text className="text-base font-pmedium text-gray-700 mb-2">Amount Range (Rs)</Text>

                            <View className="flex-row gap-2">
                                {/* Min Amount */}
                                <View className="flex-1">
                                    <Text className="text-sm text-gray-600 mb-1">Minimum</Text>
                                    <TextInput
                                        placeholder="0"
                                        value={filters.amountMin}
                                        onChangeText={(text) => setFilters(prev => ({ ...prev, amountMin: text }))}
                                        keyboardType="numeric"
                                        className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700"
                                    />
                                </View>

                                {/* Max Amount */}
                                <View className="flex-1">
                                    <Text className="text-sm text-gray-600 mb-1">Maximum</Text>
                                    <TextInput
                                        placeholder="∞"
                                        value={filters.amountMax}
                                        onChangeText={(text) => setFilters(prev => ({ ...prev, amountMax: text }))}
                                        keyboardType="numeric"
                                        className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Validation Error Message */}
                        {showValidationError && (
                            <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                <View className="flex-row items-center">
                                    <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                                    <Text className="text-red-700 font-pmedium ml-2 flex-1">
                                        Please set at least one filter before applying
                                    </Text>
                                    <TouchableOpacity onPress={() => setShowValidationError(false)}>
                                        <MaterialIcons name="close" size={18} color="#DC2626" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View className="flex-row gap-4 mt-2">
                            <View className="flex-1">
                                <CustomButton
                                    title="Clear All"
                                    handlePress={handleClearFilters}
                                    containerStyles="py-4 px-6 rounded-xl w-full"
                                    buttoncolor="bg-gray-600"
                                    textStyles="text-white font-psemibold text-base text-center"
                                />
                            </View>
                            <View className="flex-1">
                                <CustomButton
                                    title="Apply Filters"
                                    handlePress={handleApplyFilters}
                                    containerStyles="py-4 px-6 rounded-xl w-full"
                                    buttoncolor="bg-blue-600"
                                    textStyles="text-white font-psemibold text-base text-center"
                                />
                            </View>
                        </View>
                    </ScrollView>

                </View>
            </View>
        </Modal>
    );
});

export default ExpenseFilter;
