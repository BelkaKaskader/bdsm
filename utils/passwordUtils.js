const crypto = require('crypto');

// Функция для хеширования пароля
const hashPassword = (password) => {
    const salt = crypto.randomBytes(8).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100, 32, 'sha256').toString('base64');
    return `${salt}:${hash}`;
};

// Функция для проверки пароля
const validatePassword = (password, storedPassword) => {
    const [salt, hash] = storedPassword.split(':');
    const testHash = crypto.pbkdf2Sync(password, salt, 100, 32, 'sha256').toString('base64');
    return hash === testHash;
};

module.exports = {
    hashPassword,
    validatePassword
}; 