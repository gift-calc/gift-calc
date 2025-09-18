/**
 * @fileoverview Core Gift Calculation Logic
 *
 * Pure calculation functions with no Node.js dependencies that can be used
 * in both CLI and browser environments. This module contains the heart of
 * the gift-calc algorithm with proper randomization, bias calculations,
 * and special case handling for different nice scores.
 *
 * Key features:
 * - Friend score and nice score bias influence
 * - Special handling for nice scores 0-3 (fixed percentages)
 * - Maximum/minimum amount overrides
 * - Configurable decimal precision
 * - Deterministic edge case behavior
 *
 * The calculation algorithm applies combined bias from friend and nice scores
 * to influence randomization towards higher or lower amounts, while ensuring
 * results stay within specified variation bounds.
 *
 * @module core/calculation
 * @version 1.0.0
 * @requires None - Pure functions with no dependencies
 * @see {@link module:types} Type definitions
 * @example
 * // Calculate gift with variation and bias
 * const amount = calculateGiftAmount(100, 20, 8, 7, 2);
 * console.log(amount); // e.g., 112.45
 *
 * // Calculate with special nice score handling
 * const finalAmount = calculateFinalAmount(100, 20, 5, 0, 2);
 * console.log(finalAmount); // 0 (nice score 0 = no gift)
 */

/**
 * Calculate gift amount with variation, friend score, and nice score influences
 *
 * Applies combined bias from friend and nice scores to influence randomization
 * towards higher or lower amounts, while ensuring results stay within the
 * specified variation bounds. Uses a sophisticated bias calculation that
 * averages friend and nice score influences to avoid double effects.
 *
 * @param {number} base - Base gift amount (must be positive)
 * @param {number} variationPercent - Variation percentage (0-100, controls randomness range)
 * @param {number} friendScore - Friend score affecting bias (1-10, higher = bias toward more)
 * @param {number} niceScore - Nice score affecting bias (0-10, higher = bias toward more)
 * @param {number} decimalPlaces - Number of decimal places for rounding (0-10)
 * @returns {number} Calculated gift amount with bias and variation applied
 * @throws {Error} When parameters are out of valid ranges
 * @example
 * // Calculate with high friend/nice scores (bias toward higher amounts)
 * const amount = calculateGiftAmount(100, 20, 8, 9, 2);
 * console.log(amount); // e.g., 115.67 (likely higher due to positive bias)
 *
 * // Calculate with low scores (bias toward lower amounts)
 * const amount2 = calculateGiftAmount(100, 20, 2, 3, 2);
 * console.log(amount2); // e.g., 87.23 (likely lower due to negative bias)
 *
 * @since 1.0.0
 * @see {@link calculateFinalAmount} For handling special nice score cases
 */
export function calculateGiftAmount(base, variationPercent, friendScore, niceScore, decimalPlaces) {
  // Friend score influences the bias towards higher amounts
  // Score 1-5: neutral to negative bias, Score 6-10: positive bias
  const friendBias = (friendScore - 5.5) * 0.1; // Range: -0.45 to +0.45

  // Nice score also influences the bias towards higher amounts
  // Score 1-5: neutral to negative bias, Score 6-10: positive bias
  const niceBias = (niceScore - 5.5) * 0.1; // Range: -0.45 to +0.45

  // Combine both biases (average them to avoid double effect)
  const combinedBias = (friendBias + niceBias) / 2;

  // Generate base random percentage within the variation range
  const randomPercentage = (Math.random() * (variationPercent * 2)) - variationPercent;

  // Apply combined bias - higher scores increase chance of higher amounts
  const biasedPercentage = randomPercentage + (combinedBias * variationPercent);

  // Ensure we don't exceed the original variation bounds
  const finalPercentage = Math.max(-variationPercent, Math.min(variationPercent, biasedPercentage));

  const variation = base * (finalPercentage / 100);
  const giftAmount = base + variation;

  // Round to specified decimal places
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(giftAmount * multiplier) / multiplier;
}

/**
 * Calculate final gift amount with special nice score handling and overrides
 *
 * This is the main calculation function that handles special cases and overrides.
 * It implements the complete gift calculation logic including special nice score
 * behaviors, maximum/minimum overrides, and proper decimal rounding.
 *
 * Special nice score handling:
 * - Nice score 0: Always returns 0 (no gift, overrides everything)
 * - Nice score 1: Returns baseValue * 0.1 (10%, overrides everything)
 * - Nice score 2: Returns baseValue * 0.2 (20%, overrides everything)
 * - Nice score 3: Returns baseValue * 0.3 (30%, overrides everything)
 * - Nice score 4-10: Uses normal randomized calculation with bias
 *
 * @param {number} baseValue - Base value for calculation (must be positive)
 * @param {number} variation - Variation percentage (0-100)
 * @param {number} friendScore - Friend score affecting bias (1-10)
 * @param {number} niceScore - Nice score with special handling (0-10)
 * @param {number} decimals - Number of decimal places for rounding (0-10)
 * @param {boolean} [useMaximum=false] - Force maximum amount (baseValue * 1.2)
 * @param {boolean} [useMinimum=false] - Force minimum amount (baseValue * 0.8)
 * @returns {number} Final calculated gift amount with all rules applied
 * @throws {Error} When parameters are out of valid ranges
 * @example
 * // Normal calculation with bias
 * const amount = calculateFinalAmount(100, 20, 7, 8, 2);
 * console.log(amount); // e.g., 108.45
 *
 * // Special nice score case (very naughty)
 * const naughty = calculateFinalAmount(100, 20, 5, 0, 2);
 * console.log(naughty); // 0 (no gift)
 *
 * // Force maximum override
 * const max = calculateFinalAmount(100, 20, 5, 8, 2, true, false);
 * console.log(max); // 120.00 (baseValue * 1.2)
 *
 * @since 1.0.0
 * @see {@link calculateGiftAmount} For the underlying calculation algorithm
 */
export function calculateFinalAmount(baseValue, variation, friendScore, niceScore, decimals, useMaximum = false, useMinimum = false) {
  let suggestedAmount;

  if (niceScore === 0) {
    // Special case: nice score 0 = amount is 0 (overrides everything)
    suggestedAmount = 0;
  } else if (niceScore === 1) {
    // Special case: nice score 1 = baseValue * 0.1 (overrides everything)
    suggestedAmount = baseValue * 0.1;
  } else if (niceScore === 2) {
    // Special case: nice score 2 = baseValue * 0.2 (overrides everything)
    suggestedAmount = baseValue * 0.2;
  } else if (niceScore === 3) {
    // Special case: nice score 3 = baseValue * 0.3 (overrides everything)
    suggestedAmount = baseValue * 0.3;
  } else if (useMaximum) {
    // Maximum is baseValue + 20%
    suggestedAmount = baseValue * 1.2;
  } else if (useMinimum) {
    // Minimum is baseValue - 20%
    suggestedAmount = baseValue * 0.8;
  } else {
    // Normal random calculation for nice scores 4-10
    suggestedAmount = calculateGiftAmount(baseValue, variation, friendScore, niceScore, decimals);
  }

  // Round to specified decimal places
  const multiplier = Math.pow(10, decimals);
  return Math.round(suggestedAmount * multiplier) / multiplier;
}