import validator from 'validator';

/**
 * Sanitize a generic string input — trim, strip HTML, escape dangerous chars.
 */
export function sanitizeString(input) {
    if (typeof input !== 'string') return '';
    let cleaned = validator.trim(input);
    cleaned = validator.stripLow(cleaned);
    cleaned = validator.escape(cleaned);
    return cleaned;
}

/**
 * Sanitize and validate an email address.
 * Returns { valid, email } — email is normalized if valid.
 */
export function sanitizeEmail(input) {
    if (typeof input !== 'string') return { valid: false, email: '' };
    let email = validator.trim(input).toLowerCase();
    email = validator.normalizeEmail(email) || email;

    if (!validator.isEmail(email)) {
        return { valid: false, email: '' };
    }
    return { valid: true, email };
}

/**
 * Sanitize a name — allow only letters, spaces, hyphens, and apostrophes.
 */
export function sanitizeName(input) {
    if (typeof input !== 'string') return '';
    let name = validator.trim(input);
    // Remove anything that's not a letter (any script), space, hyphen, or apostrophe
    name = name.replace(/[^\p{L}\s\-']/gu, '');
    // Collapse multiple spaces
    name = name.replace(/\s{2,}/g, ' ').trim();
    // Limit length
    return name.substring(0, 50);
}

/**
 * Validate password strength.
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char.
 * Returns { valid, errors[] }
 */
export function validatePasswordStrength(password) {
    const errors = [];

    if (typeof password !== 'string') {
        return { valid: false, errors: ['Password is required.'] };
    }

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters.');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter.');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number.');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
        errors.push('Password must contain at least one special character.');
    }

    return { valid: errors.length === 0, errors };
}
