/**
 * Core Gift Calculation Logic
 * Pure calculation functions with no Node.js dependencies
 * Can be used in both CLI and browser environments
 */

/**
 * Calculate gift amount with variation, friend score, and nice score influences
 * @param {number} base - Base gift amount
 * @param {number} variationPercent - Variation percentage (0-100)
 * @param {number} friendScore - Friend score (1-10)
 * @param {number} niceScore - Nice score (0-10)
 * @param {number} decimalPlaces - Number of decimal places for rounding
 * @returns {number} Calculated gift amount
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
 * Calculate final gift amount with special nice score handling
 * @param {number} baseValue - Base value for calculation
 * @param {number} variation - Variation percentage
 * @param {number} friendScore - Friend score (1-10)
 * @param {number} niceScore - Nice score (0-10)
 * @param {number} decimals - Number of decimal places
 * @param {boolean} useMaximum - Force maximum amount
 * @param {boolean} useMinimum - Force minimum amount
 * @returns {number} Final calculated gift amount
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