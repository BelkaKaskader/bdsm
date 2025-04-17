const { sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Функция для хеширования пароля
const hashPassword = (password) => {
    const salt = crypto.randomBytes(8).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100, 32, 'sha256').toString('base64');
    return `${salt}:${hash}`;
};

async function initDatabase() {
    try {
        console.log('=== Начало инициализации базы данных ===');

        // Сброс и создание таблиц
        console.log('1. Сброс и создание таблиц...');
        await sequelize.sync({ force: true });

        // Создание администратора напрямую
        console.log('2. Создание администратора...');
        const { User } = require('../models');
        
        // Получаем пароль из .env или используем значение по умолчанию
        const plainPassword = process.env.ADMIN_PASSWORD || 'admin123';
        
        console.log('Создание хеша пароля...');
        console.log('- Исходный пароль:', plainPassword);
        
        // Хешируем пароль
        const hashedPassword = hashPassword(plainPassword);
        
        console.log('- Финальный хеш:', hashedPassword);
        
        // Создаем администратора
        await User.create({
            id: uuidv4(),
            username: process.env.ADMIN_USERNAME || 'admin',
            email: process.env.ADMIN_EMAIL || 'admin@example.com',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Проверка создания админа
        const admin = await User.findOne({ 
            where: { username: process.env.ADMIN_USERNAME || 'admin' } 
        });
        
        if (admin) {
            console.log('Администратор успешно создан');
            console.log('- ID:', admin.id);
            console.log('- Логин:', admin.username);
            console.log('- Роль:', admin.role);
        } else {
            throw new Error('Ошибка создания администратора');
        }

        // Импорт данных из Excel если нужно
        if (process.env.IMPORT_DATA === 'true') {
            console.log('3. Импорт данных из Excel...');
            const importExcel = require('../scripts/importExcel');
            await importExcel();
        }

        console.log('=== Инициализация базы данных завершена успешно ===');
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
        throw error;
    }
}

module.exports = initDatabase; 