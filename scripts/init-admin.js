require('dotenv').config();
const { User } = require('../models');

async function initAdmin() {
    try {
        const adminData = {
            username: process.env.ADMIN_USERNAME || 'admin',
            email: process.env.ADMIN_EMAIL || 'admin@example.com',
            password: process.env.ADMIN_PASSWORD || 'admin123',
            role: 'admin'
        };

        // Проверяем, существует ли уже админ
        let admin = await User.findOne({ where: { role: 'admin' } });

        if (!admin) {
            // Создаем нового админа
            admin = await User.create(adminData);
            console.log('Администратор успешно создан:', {
                username: admin.username,
                email: admin.email,
                role: admin.role
            });
        } else {
            console.log('Администратор уже существует:', {
                username: admin.username,
                email: admin.email,
                role: admin.role
            });
        }
    } catch (error) {
        console.error('Ошибка при создании администратора:', error);
        process.exit(1);
    }
}

// Запускаем создание админа
initAdmin(); 