/**
 * Currency Conversion Service
 * Provides currency conversion with caching and graceful fallback
 * Uses ExchangeRate-API (free, no API key required)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Cache configuration
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const API_BASE_URL = 'https://open.er-api.com/v6/latest';

/**
 * Get cache file path for currency rates
 */
function getCacheFilePath() {
  const homeDir = process.env.HOME || os.homedir();
  const configDir = path.join(homeDir, '.config', 'gift-calc');
  return path.join(configDir, '.currency-cache.json');
}

/**
 * Ensure cache directory exists
 */
function ensureCacheDir() {
  const cacheDir = path.dirname(getCacheFilePath());
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

/**
 * Load exchange rates from cache
 * @param {string} baseCurrency - Base currency code
 * @returns {Object|null} Cached rates or null if expired/missing
 */
function loadCachedRates(baseCurrency) {
  try {
    const cacheFile = getCacheFilePath();
    if (!fs.existsSync(cacheFile)) {
      return null;
    }

    const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const now = Date.now();

    // Check if cache exists for this base currency and isn't expired
    if (cacheData[baseCurrency] &&
        cacheData[baseCurrency].timestamp &&
        (now - cacheData[baseCurrency].timestamp) < CACHE_TTL_MS) {
      return cacheData[baseCurrency].rates;
    }

    return null;
  } catch (error) {
    // Silently ignore cache errors
    return null;
  }
}

/**
 * Save exchange rates to cache
 * @param {string} baseCurrency - Base currency code
 * @param {Object} rates - Exchange rates object
 */
function saveCachedRates(baseCurrency, rates) {
  try {
    ensureCacheDir();
    const cacheFile = getCacheFilePath();

    // Load existing cache data
    let cacheData = {};
    if (fs.existsSync(cacheFile)) {
      try {
        cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      } catch (error) {
        // Start fresh if cache is corrupted
        cacheData = {};
      }
    }

    // Update cache with new rates
    cacheData[baseCurrency] = {
      rates: rates,
      timestamp: Date.now()
    };

    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    // Silently ignore cache save errors
  }
}

/**
 * Fetch exchange rates from API
 * @param {string} baseCurrency - Base currency code
 * @returns {Promise<Object|null>} Exchange rates or null if failed
 */
async function fetchExchangeRates(baseCurrency) {
  try {
    const response = await fetch(`${API_BASE_URL}/${baseCurrency}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.result === 'success' && data.rates) {
      // Save to cache for future use
      saveCachedRates(baseCurrency, data.rates);
      return data.rates;
    }

    return null;
  } catch (error) {
    // Network or parsing error
    return null;
  }
}

/**
 * Get exchange rates with caching
 * @param {string} baseCurrency - Base currency code
 * @returns {Promise<Object|null>} Exchange rates or null if failed
 */
async function getExchangeRates(baseCurrency) {
  // Try cache first
  const cachedRates = loadCachedRates(baseCurrency);
  if (cachedRates) {
    return cachedRates;
  }

  // Fetch from API if cache miss or expired
  return await fetchExchangeRates(baseCurrency);
}

/**
 * Convert amount from base currency to target currency
 * @param {number} amount - Amount in base currency
 * @param {string} fromCurrency - Base currency code
 * @param {string} toCurrency - Target currency code
 * @param {number} decimals - Number of decimal places for result
 * @returns {Promise<Object>} Conversion result with success/error info
 */
export async function convertCurrency(amount, fromCurrency, toCurrency, decimals = 2) {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return {
      success: true,
      convertedAmount: amount,
      originalAmount: amount,
      fromCurrency,
      toCurrency,
      rate: 1,
      cached: true
    };
  }

  try {
    const rates = await getExchangeRates(fromCurrency);

    if (!rates || !rates[toCurrency]) {
      return {
        success: false,
        error: `Unable to get conversion rate from ${fromCurrency} to ${toCurrency}`,
        originalAmount: amount,
        fromCurrency,
        toCurrency
      };
    }

    const rate = rates[toCurrency];
    const convertedAmount = amount * rate;

    // Round to specified decimal places
    const multiplier = Math.pow(10, decimals);
    const roundedAmount = Math.round(convertedAmount * multiplier) / multiplier;

    return {
      success: true,
      convertedAmount: roundedAmount,
      originalAmount: amount,
      fromCurrency,
      toCurrency,
      rate,
      cached: loadCachedRates(fromCurrency) !== null
    };
  } catch (error) {
    return {
      success: false,
      error: `Conversion failed: ${error.message}`,
      originalAmount: amount,
      fromCurrency,
      toCurrency
    };
  }
}

/**
 * Format currency amount with dual currency display when needed
 * @param {number} baseAmount - Amount in base currency
 * @param {string} baseCurrency - Base currency code
 * @param {string|null} displayCurrency - Display currency code (null for base only)
 * @param {string|null} recipientName - Optional recipient name
 * @param {number} decimals - Number of decimal places
 * @returns {Promise<string>} Formatted output string
 */
export async function formatCurrencyOutput(baseAmount, baseCurrency, displayCurrency = null, recipientName = null, decimals = 2) {
  let output = '';

  // Always show base currency amount
  let formattedBase;
  if (decimals !== null) {
    if (baseAmount % 1 === 0 && decimals === 2) {
      // Whole number with default decimals (2) - don't show trailing zeros
      formattedBase = baseAmount.toString();
    } else {
      // Either non-whole number or explicitly configured decimals - show with precision
      formattedBase = baseAmount.toFixed(decimals);
    }
  } else {
    formattedBase = baseAmount.toString();
  }

  if (!displayCurrency || displayCurrency === baseCurrency) {
    // Single currency display
    output = `${formattedBase} ${baseCurrency}`;
  } else {
    // Dual currency display - convert and show both
    const conversion = await convertCurrency(baseAmount, baseCurrency, displayCurrency, decimals);

    if (conversion.success) {
      let formattedConverted;
      if (decimals !== null) {
        if (conversion.convertedAmount % 1 === 0 && decimals === 2) {
          // Whole number with default decimals (2) - don't show trailing zeros
          formattedConverted = conversion.convertedAmount.toString();
        } else {
          // Either non-whole number or explicitly configured decimals - show with precision
          formattedConverted = conversion.convertedAmount.toFixed(decimals);
        }
      } else {
        formattedConverted = conversion.convertedAmount.toString();
      }

      output = `${formattedBase} ${baseCurrency} (${formattedConverted} ${displayCurrency})`;
    } else {
      // Fallback to base currency if conversion fails
      output = `${formattedBase} ${baseCurrency}`;
    }
  }

  // Add recipient name if provided
  if (recipientName) {
    output += ` for ${recipientName}`;
  }

  return output;
}

/**
 * Get supported currencies (this is a basic list, API supports more)
 * @returns {string[]} Array of common currency codes
 */
export function getSupportedCurrencies() {
  return [
    'USD', 'EUR', 'GBP', 'JPY', 'SEK', 'NOK', 'DKK', 'CHF', 'CAD', 'AUD',
    'NZD', 'CNY', 'INR', 'KRW', 'SGD', 'HKD', 'PLN', 'CZK', 'HUF', 'RON',
    'BGN', 'HRK', 'RUB', 'TRY', 'BRL', 'MXN', 'ZAR', 'ISK', 'THB', 'MYR'
  ];
}

/**
 * Validate if currency code is likely supported
 * @param {string} currencyCode - Currency code to validate
 * @returns {boolean} True if currency code format is valid
 */
export function isValidCurrencyCode(currencyCode) {
  if (!currencyCode || typeof currencyCode !== 'string') {
    return false;
  }

  // Check format: 3 uppercase letters
  return /^[A-Z]{3}$/.test(currencyCode.toUpperCase());
}

/**
 * Clear currency cache (useful for testing or forcing refresh)
 */
export function clearCurrencyCache() {
  try {
    const cacheFile = getCacheFilePath();
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
  } catch (error) {
    // Silently ignore errors
  }
}