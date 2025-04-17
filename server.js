require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const { initDatabase, importExcelData, initAdmin } = require('./utils/initDatabase');
const fs = require('fs');

// Проверка критических переменных окружения
console.log('=== Проверка переменных окружения ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Установлен' : 'Не установлен');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Установлен' : 'Не установлен');

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET не установлен!');
    process.exit(1);
}

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://bdsm-production.up.railway.app'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Добавляем дополнительные заголовки безопасности
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    // Разрешаем предварительные запросы OPTIONS
    if ('OPTIONS' === req.method) {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Healthcheck endpoint
app.get('/health', async (req, res) => {
    try {
        // Проверяем подключение к базе данных
        await sequelize.authenticate();
        res.status(200).json({ status: 'healthy', message: 'Server is running and database is connected' });
    } catch (error) {
        console.error('Healthcheck failed:', error);
        res.status(500).json({ status: 'unhealthy', message: 'Database connection failed' });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api', apiRoutes);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client', 'build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
let server;

// Функция для корректного завершения работы сервера
const gracefulShutdown = () => {
    console.log('Получен сигнал завершения. Закрываем сервер...');
    if (server) {
        server.close(() => {
            console.log('Сервер остановлен');
            sequelize.close().then(() => {
                console.log('Соединение с базой данных закрыто');
                process.exit(0);
            });
        });
    } else {
        process.exit(0);
    }
};

// Обработка сигналов завершения
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// В Windows также обрабатываем SIGBREAK
if (process.platform === 'win32') {
    process.on('SIGBREAK', gracefulShutdown);
}

async function checkAdminExists() {
    try {
        const { User } = require('./models');
        const admin = await User.findOne({ where: { username: 'admin' } });
        return !!admin;
    } catch (error) {
        console.error('Ошибка при проверке админа:', error);
        return false;
    }
}

async function startServer() {
    try {
        // Синхронизация базы данных
        await sequelize.sync();
        console.log('База данных синхронизирована');

        // Проверяем существование админа
        const adminExists = await checkAdminExists();
        
        // Если админа нет, создаем его
        if (!adminExists) {
            console.log('Администратор не найден. Создание администратора...');
            await initAdmin();
            console.log('Администратор создан');
        } else {
            console.log('Администратор уже существует');
        }

        // Всегда импортируем данные из Excel
        console.log('Импорт данных из Excel...');
        await importExcelData();
        console.log('Импорт данных завершен');

        // Запуск сервера
        server = app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
            console.log('Для входа используйте:');
            console.log('Логин: admin');
            console.log('Пароль: admin123');
        });
    } catch (error) {
        console.error('Ошибка при запуске сервера:', error);
        process.exit(1);
    }
}

startServer(); 