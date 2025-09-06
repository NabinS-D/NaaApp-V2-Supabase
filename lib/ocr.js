const API_KEY = process.env.EXPO_PUBLIC_OCR_API_KEY;
const API_ENDPOINT = process.env.EXPO_PUBLIC_OCR_API_ENDPOINT;

// ============================================================================
// STEP 1: OCR API CALL - Send image to OCR.space for text extraction
// ============================================================================
export const processImageWithOCR = async (base64Image) => {
  if (!API_KEY) {
    throw { error: 'OCR_API_KEY_MISSING', message: 'OCR API key is missing. Please add EXPO_PUBLIC_OCR_API_KEY to your .env file' };
  }

  // Prepare OCR.space API request with optimized settings for receipts
  const formData = new FormData();
  formData.append('apikey', API_KEY);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy
  formData.append('scale', 'true'); // Auto-scale image
  formData.append('isTable', 'true'); // Better for structured text like receipts
  formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);

  try {
    // Send image to OCR.space API for text extraction with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw { error: 'HTTP_ERROR', message: `HTTP error! status: ${response.status}` };
    }

    // Parse OCR API response and extract text
    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      throw { error: 'OCR_PROCESSING_ERROR', message: `OCR processing failed: ${data.ErrorMessage}` };
    }

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      throw { error: 'NO_TEXT_EXTRACTED', message: 'No text could be extracted from the image' };
    }

    // Extract the raw text from OCR response
    const parsedText = data.ParsedResults[0].ParsedText;
    return parsedText;
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// STEP 2: TEXT PARSING - Extract amount and date from OCR text
// ============================================================================
export const parseOCRText = (text) => {
  if (!text) {
    return {};
  }

  const parsedData = {};
  const lines = text.split('\n');

  // Amount regex: looks for keywords like "TOTAL", "AMOUNT" followed by currency and numbers
  const amountRegex = /(?:total|amount|subtotal|balance|due|net|sum|price|cost|charge|bill|pay|sar|rs|rupees?)[\s:$]*\$?[\s]*([\d,]+\.?\d{0,2})/gi;
  // Date regex: matches various date formats (MM/DD/YYYY, YYYY-MM-DD, etc.)
  const dateRegex = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})|(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/;
  // Store name regex: looks for common store/business name patterns
  const storeNameRegex = /^([A-Z\s&'.-]+(?:MARKET|STORE|SHOP|MART|SUPERMARKET|RESTAURANT|CAFE|PHARMACY|MALL|CENTER|STATION|COMPANY|INC|LLC|LTD))$/i;

  // Process each line of OCR text to find amount, date, and description
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // AMOUNT DETECTION: Look for total amount in current line
    if (!parsedData.amount) {
      const amountMatch = line.match(amountRegex);
      if (amountMatch && amountMatch[1]) {
        // Clean up the matched amount by removing spaces and commas
        const cleanAmount = amountMatch[1].replace(/[\s,]/g, '');
        const amount = parseFloat(cleanAmount);
        parsedData.amount = amount;
      }
    }

    // DATE DETECTION: Look for date in current line
    if (!parsedData.date) {
      const dateMatch = line.match(dateRegex);
      if (dateMatch && (dateMatch[1] || dateMatch[2])) {
        const dateStr = dateMatch[1] || dateMatch[2];
        try {
          const date = new Date(dateStr).toISOString().split('T')[0];
          parsedData.date = date;
        } catch (dateError) {
          // Invalid date format, skip
        }
      }
    }

    // DESCRIPTION DETECTION: Look for store/business name (usually in first few lines)
    if (!parsedData.description && i < 5) {
      // Check for store name pattern
      const storeMatch = line.match(storeNameRegex);
      if (storeMatch && storeMatch[1]) {
        const storeName = storeMatch[1].trim();
        parsedData.description = `Purchase from ${storeName}`;
      }
      // Fallback: if line looks like a business name (all caps, reasonable length)
      else if (line.length > 3 && line.length < 50 && line === line.toUpperCase() &&
        !line.match(/\d/) && !line.includes('$') &&
        !line.match(/total|amount|subtotal|balance|due|net|thank|receipt/i)) {
        parsedData.description = `Purchase from ${line}`;
      }
    }
  }

  // Return extracted data (amount and date) or empty fields for manual entry
  return parsedData;
};
