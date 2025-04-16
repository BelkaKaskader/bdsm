const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error('Токен не предоставлен');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ 
            where: { 
                id: decoded.userId 
            }
        });

        if (!user) {
            throw new Error('Пользователь не найден');
        }

        if (user.isBlocked) {
            throw new Error('Пользователь заблокирован');
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Ошибка аутентификации:', error.message);
        res.status(401).json({ message: 'Пожалуйста, авторизуйтесь', error: error.message });
    }
};

module.exports = auth; 