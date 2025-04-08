require('dotenv').config();
const { registerUser } = require('./auth');

async function initAdminUser() {
    try {
        // Создаем администратора, если он еще не существует
        console.log('Инициализация администратора...');
        
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword';
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        
        try {
            const user = await registerUser(adminUsername, adminPassword, adminEmail, 'admin');
            console.log(`Администратор создан: ${user.username} (${user.role})`);
        } catch (error) {
            if (error.message.includes('уже существует')) {
                console.log('Администратор уже существует, пропускаем создание');
            } else {
                throw error;
            }
        }
        
        console.log('Инициализация завершена успешно');
    } catch (error) {
        console.error('Ошибка при инициализации пользователей:', error);
    }
}

// Запуск инициализации, если скрипт вызван напрямую
if (require.main === module) {
    initAdminUser().catch(console.error);
}

module.exports = { initAdminUser }; 