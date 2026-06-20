/**
 * Helper utility functions
 */

/**
 * Safely parse rounds field from database
 * Handles both JSON array format and comma-separated string format
 * @param {string|Array} roundsData - The rounds data from database
 * @returns {Array} Array of round names
 */
export const parseRounds = (roundsData) => {
  if (!roundsData) {
    return [];
  }

  // If already an array, return it
  if (Array.isArray(roundsData)) {
    return roundsData;
  }

  // If it's a string, try to parse it
  if (typeof roundsData === 'string') {
    // Try JSON parse first
    try {
      const parsed = JSON.parse(roundsData);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // If JSON parse fails, it might be comma-separated string
      // Split by comma and trim each value
      if (roundsData.includes(',')) {
        return roundsData.split(',').map(r => r.trim()).filter(r => r);
      }
      // If it's a single value, return as array
      return [roundsData.trim()];
    }
  }

  return [];
};

