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
                    const plainPassword = user.password;
                    console.log('Исходный пароль:', plainPassword);
                    console.log('Длина исходного пароля:', plainPassword.length);
                    
                    // Проверяем, не является ли пароль уже хешем bcrypt
                    const isBcryptHash = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(plainPassword);
                    if (isBcryptHash) {
                        console.log('Пароль уже является bcrypt хешем, пропускаем хеширование');
                        console.groupEnd();
                        return;
                    }

                    const salt = await bcrypt.genSalt(10);
                    console.log('Сгенерированная соль:', salt);
                    user.password = await bcrypt.hash(plainPassword, salt);
                    console.log('Итоговый хеш:', user.password);
                    
                    // Проверяем хеширование
                    const verifyHash = await bcrypt.compare(plainPassword, user.password);
                    console.log('Проверка хеширования:', verifyHash);
                    console.groupEnd();
                }
            }
        }
    });

    User.prototype.validatePassword = async function(password) {
        console.group('=== Проверка пароля в модели User ===');
        try {
            console.log('Введенный пароль:', password);
            console.log('Длина введенного пароля:', password.length);
            console.log('Хеш в базе:', this.password);
            
            // Проверяем, что хеш в базе имеет правильный формат
            const isValidHash = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(this.password);
            console.log('Хеш в базе имеет правильный формат:', isValidHash);
            
            if (!isValidHash) {
                console.error('Ошибка: хеш пароля в базе имеет неправильный формат');
                console.groupEnd();
                return false;
            }

            // Пробуем сравнить напрямую через bcrypt
            const isValid = await bcrypt.compare(password, this.password);
            console.log('Результат проверки bcrypt.compare:', isValid);
            
            // Дополнительная проверка - создаем новый хеш с тем же паролем
            const salt = await bcrypt.genSalt(10);
            const newHash = await bcrypt.hash(password, salt);
            console.log('Тестовый хеш того же пароля:', newHash);
            
            // Сравниваем новый хеш с тем же паролем
            const testValid = await bcrypt.compare(password, newHash);
            console.log('Тестовая проверка с новым хешем:', testValid);

            console.groupEnd();
            return isValid;
        } catch (error) {
            console.error('Ошибка при проверке пароля:', error);
            console.error('Стек ошибки:', error.stack);
            console.groupEnd();
            return false;
        }
    };

    return User;
}; 