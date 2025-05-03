/**
 * Utility functions for consistent number formatting across charts
 */

/**
 * Format a number to 2 decimal places
 * @param {number|string} value - The value to format
 * @returns {string|number} - Formatted value with 2 decimal places if it's a number
 */
export const formatNumber = (value) => {
    if (value === undefined || value === null) return value;

    if (typeof value === 'number') {
        return value.toFixed(2);
    }

    // Try to convert string to number if possible
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
        return parseFloat(value).toFixed(2);
    }

    return value;
};

/**
 * Custom tooltip formatter for Recharts
 * @param {number|string} value - The value to format
 * @param {string} name - The name of the data
 * @param {Object} props - Additional properties
 * @returns {Array} - [formattedValue, name]
 */
export const tooltipFormatter = (value, name, props) => {
    if (typeof value === 'number') {
        return [value.toFixed(2), name];
    }

    // Try to convert string to number if possible
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
        return [parseFloat(value).toFixed(2), name];
    }

    return [value, name];
};

/**
 * Format a number for axis ticks
 * @param {number|string} value - The value to format
 * @returns {string} - Formatted value
 */
export const axisTickFormatter = (value) => {
    if (typeof value === 'number') {
        // Determine appropriate formatting based on magnitude
        if (Math.abs(value) >= 1000000) {
            return (value / 1000000).toFixed(2) + 'M';
        } else if (Math.abs(value) >= 1000) {
            return (value / 1000).toFixed(2) + 'K';
        } else {
            return value.toFixed(2);
        }
    }
    return value;
};

/**
 * Format a percentage value
 * @param {number} value - The value to format as percentage
 * @returns {string} - Formatted percentage
 */
export const percentFormatter = (value) => {
    if (typeof value === 'number') {
        return value.toFixed(2) + '%';
    }
    return value;
};

/**
 * Round numbers in objects or arrays recursively
 * @param {Object|Array} obj - Object or array containing numbers to round
 * @returns {Object|Array} - Object or array with rounded numbers
 */
export const roundNumbersInObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const newObj = Array.isArray(obj) ? [...obj] : {...obj};

    Object.keys(newObj).forEach(key => {
        if (typeof newObj[key] === 'number') {
            // Round to 2 decimal places
            newObj[key] = parseFloat(newObj[key].toFixed(2));
        } else if (typeof newObj[key] === 'object') {
            // Recursively process nested objects/arrays
            newObj[key] = roundNumbersInObject(newObj[key]);
        }
    });

    return newObj;
};

export default {
    formatNumber,
    tooltipFormatter,
    axisTickFormatter,
    percentFormatter,
    roundNumbersInObject
};