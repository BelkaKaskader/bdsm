-- Создание таблицы Сводная, если она не существует
CREATE TABLE IF NOT EXISTS "Сводная" (
    id UUID PRIMARY KEY,
    "код_окэд" VARCHAR(255) NOT NULL,
    "вид_деятельности" VARCHAR(255) NOT NULL,
    "количество_нп" INTEGER NOT NULL,
    "средняя_численность_работников" NUMERIC(15,2) NOT NULL,
    "Сумма_по_полю_ФОТт" DECIMAL(15,2) NOT NULL,
    "Сумма_по_полю_ср.зп" DECIMAL(15,2) NOT NULL,
    "ипн" DECIMAL(15,2) NOT NULL,
    "сн" DECIMAL(15,2) NOT NULL,
    "сумма_налогов" DECIMAL(15,2) NOT NULL,
    "удельный_вес" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
); 