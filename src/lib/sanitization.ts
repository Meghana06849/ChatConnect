/**
 * Input Sanitization Utilities
 * Prevents XSS attacks and malicious input
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param text - The text to escape
 * @returns Escaped text safe for HTML rendering
 */
export const escapeHtml = (text: string | null | undefined): string => {
  if (!text) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return String(text).replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Sanitize user input for display
 * Removes potentially dangerous characters and escapes HTML
 * @param input - The input to sanitize
 * @returns Sanitized text
 */
export const sanitizeInput = (input: string | null | undefined): string => {
  if (!input) return '';

  let sanitized = String(input)
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove other dangerous tags
    .replace(/<(embed|object|link|style|meta)\b[^>]*>/gi, '');

  // Escape remaining HTML
  return escapeHtml(sanitized).trim();
};

/**
 * Validate and sanitize email
 * @param email - The email to validate
 * @returns Sanitized email or null if invalid
 */
export const sanitizeEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;

  const sanitized = sanitizeInput(email).toLowerCase().trim();
  
  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
};

/**
 * Validate and sanitize username
 * Only allow alphanumeric, underscore, and hyphen
 * @param username - The username to validate
 * @returns Sanitized username or null if invalid
 */
export const sanitizeUsername = (username: string | null | undefined): string | null => {
  if (!username) return null;

  const sanitized = username.trim();
  
  // Only allow alphanumeric, underscore, hyphen
  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(sanitized)) {
    return null;
  }

  return sanitized;
};

/**
 * Validate and sanitize URL
 * @param url - The URL to validate
 * @returns Sanitized URL or null if invalid
 */
export const sanitizeUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null;
    }

    return urlObj.toString();
  } catch {
    return null;
  }
};

/**
 * Validate and sanitize phone number
 * Removes all non-digit characters except + for international
 * @param phone - The phone number to validate
 * @returns Sanitized phone number or null if invalid
 */
export const sanitizePhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;

  const sanitized = phone.replace(/[^\d+]/g, '');
  
  // Check if it's a valid phone number (7-15 digits)
  if (!/^\+?[0-9]{7,15}$/.test(sanitized)) {
    return null;
  }

  return sanitized;
};

/**
 * Validate and sanitize text input with character limit
 * @param text - The text to validate
 * @param maxLength - Maximum allowed length
 * @returns Sanitized text or null if too long
 */
export const sanitizeText = (
  text: string | null | undefined,
  maxLength: number = 1000
): string | null => {
  if (!text) return null;

  const sanitized = sanitizeInput(text);
  
  if (sanitized.length > maxLength) {
    return null;
  }

  return sanitized;
};

/**
 * Validate JSON string
 * @param jsonString - The JSON string to validate
 * @returns Parsed object or null if invalid
 */
export const sanitizeJson = <T = unknown>(
  jsonString: string | null | undefined
): T | null => {
  if (!jsonString) return null;

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
};

/**
 * Remove all HTML tags from text
 * @param html - HTML string to clean
 * @returns Plain text without HTML tags
 */
export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return '';

  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
};

/**
 * Sanitize object keys and values (shallow)
 * @param obj - The object to sanitize
 * @returns Object with sanitized keys and string values
 */
export const sanitizeObject = (
  obj: Record<string, unknown>
): Record<string, string> => {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeInput(key);
    
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeInput(value);
    } else if (value !== null && value !== undefined) {
      sanitized[sanitizedKey] = sanitizeInput(String(value));
    }
  }

  return sanitized;
};
