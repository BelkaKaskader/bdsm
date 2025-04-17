require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Sequelize } = require('sequelize');
const { User } = require('../models');

async function createAdminUser() {
    try {
        console.group('=== Создание администратора ===');
        
        // Данные администратора
        const adminData = {
            id: uuidv4(),
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        console.log('Проверка существующего администратора...');
        const existingAdmin = await User.findOne({
            where: { username: adminData.username }
        });

        if (existingAdmin) {
            console.log('Администратор уже существует. Обновляем пароль...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminData.password, salt);
            
            await existingAdmin.update({
                password: hashedPassword
            });
            
            console.log('Пароль администратора успешно обновлен');
        } else {
            console.log('Создание нового администратора...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminData.password, salt);
            
            await User.create({
                ...adminData,
                password: hashedPassword
            });
            
            console.log('Администратор успешно создан');
        }

        console.log('Учетные данные администратора:');
        console.log('Логин:', adminData.username);
        console.log('Пароль:', adminData.password);
        console.groupEnd();

    } catch (error) {
        console.error('Ошибка при создании администратора:', error);
    } finally {
        process.exit();
    }
}

createAdminUser(); 