const auth = async (req, res, next) => {
    // Пропускаем все запросы без проверки
    next();
};

module.exports = auth; 