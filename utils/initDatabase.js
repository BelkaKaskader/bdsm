const { sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const XLSX = require('xlsx');
const { Сводная } = require('../models');

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
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        
        console.log('Создание администратора...');
        console.log('- Пароль:', password);
        
        // Создаем администратора
        await User.create({
            id: uuidv4(),
            username: process.env.ADMIN_USERNAME || 'admin',
            email: process.env.ADMIN_EMAIL || 'admin@example.com',
            password: password,
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
            console.log('- Пароль:', admin.password);
            console.log('- Роль:', admin.role);
        } else {
            throw new Error('Ошибка создания администратора');
        }

        // Импорт данных из Excel
        console.log('3. Импорт данных из Excel...');
        const excelPath = path.join(__dirname, '../otchety/data.xlsx');
        
        try {
            console.log(`Чтение файла: ${excelPath}`);
            const workbook = XLSX.readFile(excelPath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Преобразуем в JSON
            const data = XLSX.utils.sheet_to_json(worksheet);
            console.log(`Найдено ${data.length} записей в Excel файле`);

            // Импортируем данные
            let importedCount = 0;
            for (const row of data) {
                if (!row['Код ОКЭД'] || row['Код ОКЭД'] === 'Общий итог') {
                    continue;
                }

                await Сводная.create({
                    код_окэд: row['Код ОКЭД'],
                    вид_деятельности: row['Вид деятельности'],
                    количество_нп: parseInt(row['Количество НП']) || 0,
                    средняя_численность_работников: row['Средняя численность работников'] || '0',
                    Сумма_по_полю_ФОТт: parseFloat(row['Сумма по полю ФОТ']) || 0,
                    Сумма_по_полю_ср_зп: parseFloat(row['Сумма по полю ср.зп']) || 0,
                    сумма_налогов: parseFloat(row['Сумма налогов']) || 0,
                    удельный_вес: parseFloat(row['Удельный вес %']) || 0
                });
                importedCount++;
            }
            console.log(`Успешно импортировано ${importedCount} записей`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.error('Файл data.xlsx не найден в папке /otchety/');
            } else {
                console.error('Ошибка при импорте данных:', error);
            }
            throw error;
        }

        console.log('=== Инициализация базы данных завершена успешно ===');
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
        throw error;
    }
}

module.exports = initDatabase; 