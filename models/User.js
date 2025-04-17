const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

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
                    console.log('Исходный пароль (длина):', user.password.length);
                    const salt = await bcrypt.genSalt(10);
                    console.log('Сгенерированная соль:', salt);
                    user.password = await bcrypt.hash(user.password, salt);
                    console.log('Итоговый хеш:', user.password);
                    // Проверяем хеширование
                    const verifyHash = await bcrypt.compare(user.password, user.password);
                    console.log('Проверка хеширования:', verifyHash);
                    console.groupEnd();
                }
            }
        }
    });

    User.prototype.validatePassword = async function(password) {
        console.group('=== Проверка пароля в модели User ===');
        console.log('Длина введенного пароля:', password.length);
        console.log('Хеш в базе:', this.password);
        try {
            const isValid = await bcrypt.compare(password, this.password);
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