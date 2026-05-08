// src/utils/generateCode.js

/**
 * Converts a human-readable name to an UPPER_CASE code.
 * e.g., "Lab Admin" → "LAB_ADMIN"
 *
 * @param {string} name
 * @returns {string}
 */
function generateCodeFromName(name) {
  if (!name) return "";

  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")   // remove special chars
    .replace(/\s+/g, "_");         // spaces → underscore
}

module.exports = { generateCodeFromName };
