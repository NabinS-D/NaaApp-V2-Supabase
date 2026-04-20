import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Picker } from '@react-native-picker/picker';
import CustomModal from './CustomModal';
import { bulkImportExpenses } from '../lib/APIs/ExpenseApiSupabase';
import useAlertContext from '../context/AlertProvider';
import { MaterialIcons } from '@expo/vector-icons';
import CustomButton from './CustomButton';

const CSVUploader = ({
  visible,
  onClose,
  onUploadComplete,
  categories,
  userId
}) => {
  const { showAlert } = useAlertContext();
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('select'); // select, preview, mapping, confirm

  // Column mapping options
  const fieldOptions = [
    { key: 'amount', label: 'Amount', required: true },
    { key: 'description', label: 'Description', required: true },
    { key: 'category', label: 'Category', required: false },
    { key: 'date', label: 'Date', required: false },
    { key: 'ignore', label: 'Ignore Column', required: false }
  ];

  // Common column name variations
  const columnVariations = {
    amount: ['amount', 'cost', 'price', 'total', 'value', 'expense'],
    description: ['description', 'details', 'item', 'expense', 'note', 'title'],
    category: ['category', 'type', 'group', 'classification'],
    date: ['date', 'transaction date', 'created', 'when', 'timestamp']
  };

  const selectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/excel',
          'application/x-excel',
          'application/x-msexcel'
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        await parseFile(file);
      }
    } catch (error) {
      showAlert('Error', 'Failed to select file: ' + error.message, 'error');
    }
  };

  const parseFile = async (file) => {
    setIsProcessing(true);
    try {
      const response = await fetch(file.uri);
      const fileContent = await response.text();

      let parsedResult;
      let headers = [];

      if (file.name.toLowerCase().endsWith('.csv')) {
        // Parse CSV
        parsedResult = Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase()
        });

        if (parsedResult.errors.length > 0) {
          showAlert('Parse Error', 'CSV parsing failed: ' + parsedResult.errors[0].message, 'error');
          return;
        }

        setParsedData(parsedResult.data);
        headers = Object.keys(parsedResult.data[0] || {});
      } else {
        // Parse Excel
        const workbook = XLSX.read(fileContent, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: ''
        });

        if (jsonData.length < 2) {
          showAlert('Error', 'Excel file must have at least a header row and one data row', 'error');
          return;
        }

        // Convert to Papa Parse format
        headers = jsonData[0].map(h => String(h).trim().toLowerCase());
        const rows = jsonData.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });

        setParsedData(rows);
      }

      // Auto-detect column mapping with the correct headers
      autoDetectColumns(headers);
    } catch (error) {
      showAlert('Error', 'Failed to parse file: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const autoDetectColumns = (headers) => {
    console.log('=== AUTO DETECT COLUMNS ===');
    console.log('Headers received:', headers);

    const mapping = {};
    const confidence = {};

    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      console.log(`Processing header: "${header}" -> normalized: "${normalizedHeader}"`);

      // Find best match for each field with confidence scoring
      for (const [field, variations] of Object.entries(columnVariations)) {
        const matchScore = variations.reduce((score, variation) => {
          if (normalizedHeader === variation) return 100; // Exact match
          if (normalizedHeader.includes(variation)) return 80; // Contains match
          if (variation.includes(normalizedHeader)) return 60; // Partial match
          return score;
        }, 0);

        if (matchScore > 0 && (!mapping[header] || matchScore > confidence[header])) {
          mapping[header] = field;
          confidence[header] = matchScore;
          console.log(`  Mapped "${header}" -> "${field}" (confidence: ${matchScore})`);
        }
      }

      // If no match found, default to ignore
      if (!mapping[header]) {
        mapping[header] = 'ignore';
        confidence[header] = 0;
        console.log(`  No match for "${header}" -> ignore`);
      }
    });

    console.log('Final mapping:', mapping);
    console.log('Final confidence:', confidence);
    setColumnMapping(mapping);

    // Check if we have confident mappings for required fields
    const requiredFields = ['amount', 'description'];
    const mappedFields = Object.values(mapping);
    const hasRequiredFields = requiredFields.every(field => mappedFields.includes(field));

    console.log('Required fields:', requiredFields);
    console.log('Mapped fields:', mappedFields);
    console.log('Has required fields:', hasRequiredFields);

    // Check confidence levels for required mappings
    const requiredMappingsConfident = Object.entries(mapping)
      .filter(([_, field]) => requiredFields.includes(field))
      .every(([header, _]) => confidence[header] >= 80);

    console.log('Required mappings confident:', requiredMappingsConfident);

    // If we have high confidence in required field mappings, skip manual mapping
    if (hasRequiredFields && requiredMappingsConfident) {
      console.log('✅ Auto-detection successful - going to preview');
      setCurrentStep('preview');
    } else {
      console.log('❌ Auto-detection failed - going to manual mapping');
      setCurrentStep('mapping');
    }
  };

  const validateMapping = () => {
    const requiredFields = fieldOptions.filter(f => f.required).map(f => f.key);
    const mappedFields = Object.values(columnMapping);

    const missingFields = requiredFields.filter(field => !mappedFields.includes(field));

    if (missingFields.length > 0) {
      showAlert(
        'Missing Required Fields',
        `Please map the following required fields: ${missingFields.join(', ')}`,
        'error'
      );
      return false;
    }

    return true;
  };

  const processData = async () => {
    if (!validateMapping()) return;

    setIsProcessing(true);
    try {
      const processedExpenses = [];
      const errors = [];

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        const expense = {};

        // Map columns to expense fields
        Object.entries(columnMapping).forEach(([csvColumn, expenseField]) => {
          if (expenseField !== 'ignore') {
            expense[expenseField] = row[csvColumn];
          }
        });

        // Validate and process each expense
        try {
          // Validate amount
          const amount = parseFloat(expense.amount);
          if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${i + 1}: Invalid amount "${expense.amount}"`);
            continue;
          }

          // Validate description
          if (!expense.description || expense.description.trim() === '') {
            errors.push(`Row ${i + 1}: Description is required`);
            continue;
          }

          // Process category
          let categoryId = null;
          if (expense.category) {
            const matchedCategory = categories.find(cat =>
              cat.category_name.toLowerCase() === expense.category.toLowerCase()
            );
            categoryId = matchedCategory ? matchedCategory.id : null;
          }

          // Process date - Enhanced parsing with multiple format support
          let processedDate = null;
          if (expense.date) {
            const dateStr = expense.date.toString().trim();
            
            // Try multiple date parsing approaches
            let parsedDate = null;
            
            // Method 1: Direct parsing (works for ISO formats like 2025-08-30)
            parsedDate = new Date(dateStr);
            
            // Method 2: If direct parsing fails, try common formats
            if (isNaN(parsedDate.getTime())) {
              // Try DD/MM/YYYY or DD-MM-YYYY formats
              const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
              if (ddmmyyyy) {
                const [, day, month, year] = ddmmyyyy;
                parsedDate = new Date(year, month - 1, day); // month is 0-indexed
              }
              
              // Try YYYY/MM/DD or YYYY-MM-DD formats (already handled by direct parsing)
              // Try MM/DD/YYYY format
              const mmddyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
              if (mmddyyyy && isNaN(parsedDate.getTime())) {
                const [, month, day, year] = mmddyyyy;
                parsedDate = new Date(year, month - 1, day);
              }
            }
            
            // Only use parsed date if it's valid
            if (!isNaN(parsedDate.getTime())) {
              processedDate = parsedDate.toISOString();
              console.log(`✅ Parsed date: "${dateStr}" -> "${processedDate}"`);
            } else {
              console.log(`❌ Failed to parse date: "${dateStr}" - skipping this expense`);
              errors.push(`Row ${i + 1}: Invalid date format "${dateStr}"`);
              continue; // Skip this expense instead of using current date
            }
          } else {
            console.log(`⚠️ No date field found for expense: ${expense.description} - skipping`);
            errors.push(`Row ${i + 1}: Missing date field`);
            continue; // Skip expenses without dates
          }

          processedExpenses.push({
            amount: amount,
            description: expense.description.trim(),
            categoryId: categoryId,
            createdAt: processedDate
          });

          console.log(`📝 Added expense: ${expense.description} with date: ${processedDate}`);
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        showAlert(
          'Processing Errors',
          `${errors.length} rows had errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`,
          'warning'
        );
      }

      if (processedExpenses.length === 0) {
        showAlert('Error', 'No valid expenses found to import', 'error');
        return;
      }

      // Use bulk import with date preservation instead of passing to parent
      const importResults = await bulkImportExpenses(processedExpenses, userId);
      
      showAlert(
        'Import Complete',
        `Successfully imported ${importResults.success} expenses.${importResults.failed > 0 ? `\nFailed: ${importResults.failed}` : ''}`,
        'success'
      );

      // Notify parent component of completion (without data)
      onUploadComplete([]);
      resetState();
      onClose();
    } catch (error) {
      showAlert('Error', 'Failed to process data: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setParsedData([]);
    setColumnMapping({});
    setCurrentStep('select');
  };

  const renderFileSelection = () => (
    <View className="items-center py-8">
      <MaterialIcons name="cloud-upload" size={64} color="#6B7280" />
      <Text className="text-lg font-pmedium text-gray-700 mt-4 mb-2">
        Upload CSV or Excel File
      </Text>
      <Text className="text-sm text-gray-500 text-center mb-6">
        Select a file containing your expense data
      </Text>
      <CustomButton
        title="Select File"
        handlePress={selectFile}
        containerStyles="px-8 py-3 rounded-xl"
        buttoncolor="bg-blue-600"
        textStyles="text-white font-psemibold"
      />
    </View>
  );

  const renderPreview = () => {
    // Check if auto-detection was successful
    const requiredFields = ['amount', 'description'];
    const mappedFields = Object.values(columnMapping);
    const hasRequiredFields = requiredFields.every(field => mappedFields.includes(field));

    return (
      <View>
        <Text className="text-lg font-pmedium text-gray-700 mb-4">
          File Preview: {selectedFile?.name}
        </Text>
        <Text className="text-sm text-gray-600 mb-4">
          Found {parsedData.length} rows. First 3 rows:
        </Text>

        <ScrollView horizontal className="mb-4">
          <View className="bg-gray-50 p-3 rounded-lg">
            {parsedData.slice(0, 3).map((row, index) => (
              <View key={index} className="mb-2">
                <Text className="font-pmedium text-xs text-gray-600">Row {index + 1}:</Text>
                <Text className="text-xs text-gray-800">
                  {JSON.stringify(row, null, 2)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Show detected column mappings */}
        {hasRequiredFields && (
          <View className="bg-green-50 p-3 rounded-lg mb-4">
            <Text className="text-sm font-pmedium text-green-800 mb-2">
              ✅ Auto-detected mappings:
            </Text>
            {Object.entries(columnMapping)
              .filter(([_, field]) => field !== 'ignore')
              .map(([column, field]) => (
                <Text key={column} className="text-xs text-green-700">
                  • {column} → {field}
                </Text>
              ))}
          </View>
        )}

        <View className="flex-row justify-between gap-3">
          <View className="w-[45%]">
            <CustomButton
              title="Back"
              handlePress={() => setCurrentStep('select')}
              containerStyles="flex-1 py-4 px-6 rounded-xl"
              buttoncolor="bg-blue-500"
              textStyles="text-white text-base font-pmedium text-center"
              fullWidth />
          </View>

          {hasRequiredFields ? (
            <View className="w-[45%]">
              <CustomButton
                title="Import Now"
                handlePress={processData}
                containerStyles="flex-1 py-4 px-6 rounded-xl"
                buttoncolor="bg-green-500"
                textStyles="text-white text-base font-pmedium text-center"
                fullWidth
              />
            </View>
          ) : (
            <CustomButton
              title="Manual Mapping"
              handlePress={() => setCurrentStep('mapping')}
              containerStyles="flex-1 py-4 px-6 rounded-xl"
              buttoncolor="bg-blue-600"
              textStyles="text-white text-base font-pmedium text-center"
            />
          )}
        </View>
      </View>
    );
  };

  const renderColumnMapping = () => (
    <View>
      <Text className="text-lg font-pmedium text-gray-700 mb-4">
        Map CSV Columns to Expense Fields
      </Text>

      <ScrollView className="max-h-80 mb-4">
        {Object.keys(parsedData[0] || {}).map(csvColumn => (
          <View key={csvColumn} className="flex-row items-center justify-between py-2 border-b border-gray-200">
            <Text className="flex-1 text-sm font-pmedium text-gray-700">
              {csvColumn}
            </Text>
            <View className="flex-1">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {fieldOptions.map(option => (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setColumnMapping(prev => ({
                        ...prev,
                        [csvColumn]: option.key
                      }))}
                      className={`px-3 py-1 rounded-full ${columnMapping[csvColumn] === option.key
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                        }`}
                    >
                      <Text className={`text-xs ${columnMapping[csvColumn] === option.key
                        ? 'text-white font-pmedium'
                        : 'text-gray-600'
                        }`}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row justify-between w-full mt-4 gap-3">
        <CustomButton
          title="Back"
          handlePress={() => setCurrentStep('preview')}
          containerStyles="flex-1 py-3 rounded-xl"
          buttoncolor="bg-gray-100 border border-gray-300"
          textStyles="text-black font-psemibold text-base text-center"
        />
        <CustomButton
          title="Import Expenses"
          handlePress={processData}
          containerStyles="py-3 px-4 rounded-xl w-full"
          buttoncolor="bg-blue-500"
          textStyles="text-white text-sm font-pmedium text-center"
        />
      </View>
    </View>
  );

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
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-psemibold text-gray-800">
              Import Expenses
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {isProcessing && (
            <View className="absolute inset-0 bg-white/90 rounded-lg flex-1 justify-center items-center z-10">
              <ActivityIndicator size="large" color="#2563EB" />
              <Text className="mt-2 text-gray-600">Processing...</Text>
            </View>
          )}

          {/* Content based on current step */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {currentStep === 'select' && renderFileSelection()}
            {currentStep === 'preview' && renderPreview()}
            {currentStep === 'mapping' && renderColumnMapping()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default CSVUploader;
