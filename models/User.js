const { DataTypes } = require('sequelize');
const crypto = require('crypto');

// Функция для хеширования пароля
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

// Функция для проверки пароля
const validatePassword = (password, storedPassword) => {
    const [salt, hash] = storedPassword.split(':');
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === testHash;
};

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'user',
            validate: {
                isIn: [['admin', 'user']]
            }
        },
        isBlocked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        resetPasswordToken: {
            type: DataTypes.STRING
        },
        resetPasswordExpires: {
            type: DataTypes.DATE
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id'
            }
        }
    }, {
        tableName: 'Users',
        timestamps: true,
        hooks: {
            beforeSave: async (user) => {
                if (user.changed('password')) {
                    console.group('=== Хеширование пароля в модели User ===');
                    const plainPassword = user.password;
                    console.log('Исходный пароль:', plainPassword);
                    
                    // Хешируем пароль
                    user.password = hashPassword(plainPassword);
                    
                    console.log('Финальный хеш:', user.password);
                    console.groupEnd();
                }
            }
        }
    });

    User.prototype.validatePassword = async function(password) {
        console.group('=== Проверка пароля в модели User ===');
        try {
            console.log('Введенный пароль:', password);
            console.log('Хеш в базе:', this.password);
            
            // Проверяем пароль
            const isValid = validatePassword(password, this.password);
            
            console.log('Результат проверки:', isValid);
            console.groupEnd();
            return isValid;
        } catch (error) {
            console.error('Ошибка при проверке пароля:', error);
            console.groupEnd();
            return false;
        }
    };

    return User;
}; 