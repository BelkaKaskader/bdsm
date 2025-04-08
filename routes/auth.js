const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Регистрация нового пользователя (только для администраторов)
router.post('/register', auth, adminAuth, async (req, res) => {
    try {
        const { username, email, password, role = 'user' } = req.body;

        // Проверка существования пользователя
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь уже существует' });
        }

        // Создание нового пользователя
        const user = new User({ 
            username, 
            email, 
            password, 
            role,
            createdBy: req.user._id // Добавляем информацию о том, кто создал пользователя
        });
        await user.save();

        res.status(201).json({ 
            message: 'Пользователь успешно создан',
            user: { 
                id: user._id, 
                username, 
                email,
                role 
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при регистрации пользователя' });
    }
});

// Авторизация
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Поиск пользователя
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        // Проверка блокировки
        if (user.isBlocked) {
            return res.status(403).json({ message: 'Аккаунт заблокирован' });
        }

        // Проверка пароля
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        // Создание токена
        const token = jwt.sign(
            { 
                userId: user._id,
                role: user.role 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '12h' }
        );

        res.json({ 
            user: { 
                id: user._id, 
                username: user.username, 
                email,
                role: user.role 
            }, 
            token 
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при авторизации' });
    }
});

// Получение профиля пользователя
router.get('/profile', auth, async (req, res) => {
    try {
        res.json({ 
            user: { 
                id: req.user._id, 
                username: req.user.username, 
                email: req.user.email,
                role: req.user.role 
            } 
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении профиля' });
    }
});

// Получение списка пользователей (только для администраторов)
router.get('/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении списка пользователей' });
    }
});

// Удаление пользователя (только для администраторов)
router.delete('/users/:userId', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Запрещаем удалять последнего администратора
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Невозможно удалить последнего администратора' });
            }
        }

        await user.remove();
        res.json({ message: 'Пользователь успешно удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении пользователя' });
    }
});

// Изменение роли пользователя (только для администраторов)
router.patch('/users/:userId/role', auth, adminAuth, async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Запрещаем изменять роль последнего администратора
        if (user.role === 'admin' && role !== 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Невозможно изменить роль последнего администратора' });
            }
        }

        user.role = role;
        await user.save();

        res.json({ 
            message: 'Роль пользователя успешно изменена',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при изменении роли пользователя' });
    }
});

// Блокировка/разблокировка пользователя (только для администраторов)
router.patch('/users/:userId/block', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Запрещаем блокировать последнего администратора
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Невозможно заблокировать последнего администратора' });
            }
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({ 
            message: `Пользователь успешно ${user.isBlocked ? 'заблокирован' : 'разблокирован'}`,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isBlocked: user.isBlocked
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при блокировке/разблокировке пользователя' });
    }
});

// Запрос на сброс пароля
router.post('/reset-password-request', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Генерация токена для сброса пароля
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 час
        await user.save();

        // В реальном приложении здесь нужно отправить email с токеном
        res.json({ 
            message: 'Инструкции по сбросу пароля отправлены на email',
            resetToken // В реальном приложении этот токен должен быть отправлен по email
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при запросе сброса пароля' });
    }
});

// Сброс пароля
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Недействительный или просроченный токен сброса пароля' });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Пароль успешно изменен' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при сбросе пароля' });
    }
});

// Удаление своего профиля (запрещено)
router.delete('/profile', auth, async (req, res) => {
    return res.status(403).json({ message: 'Удаление профиля запрещено. Обратитесь к администратору.' });
});

module.exports = router; 