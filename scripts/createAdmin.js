require('dotenv').config();
const sequelize = require('../config/database');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

const createAdmin = async () => {
    try {
        await sequelize.sync();

        const adminData = {
            id: uuidv4(),
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            createdBy: uuidv4() // Временный UUID для первого администратора
        };

        const existingAdmin = await User.findOne({ where: { email: adminData.email } });
        if (existingAdmin) {
            console.log('Администратор уже существует');
            process.exit(0);
        }

        // Создаем администратора
        const admin = await User.create(adminData);
        
        // Обновляем createdBy на реальный ID
        admin.createdBy = admin.id;
        await admin.save();

        console.log('Администратор успешно создан');
        process.exit(0);
    } catch (error) {
        console.error('Ошибка при создании администратора:', error);
        process.exit(1);
    }
};

createAdmin(); 