import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Paper 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.group('=== Отправка формы входа ===');
      console.log('Логин:', username);
      console.log('Длина пароля:', password.length);
      console.log('Пароль содержит пробелы в начале/конце:', password !== password.trim());
      
      // Очищаем пароль от пробелов
      const cleanPassword = password.trim();
      
      console.log('Отправка данных на сервер:', {
        username,
        passwordLength: cleanPassword.length
      });

      const response = await api.post('/auth/login', {
        username,
        password: cleanPassword
      });
      
      console.log('Ответ сервера:', {
        status: response.status,
        statusText: response.statusText,
        data: {
          ...response.data,
          token: response.data.token ? 'JWT получен' : 'JWT отсутствует'
        }
      });

      if (!response.data.token) {
        throw new Error('Токен не получен от сервера');
      }

      localStorage.setItem('token', response.data.token);
      onLoginSuccess();
      navigate('/dashboard');
      console.groupEnd();
    } catch (err: any) {
      console.group('=== Ошибка входа ===');
      console.error('Детали ошибки:', {
        message: err.message,
        response: {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        }
      });
      console.groupEnd();
      setError(err.response?.data?.message || 'Неверное имя пользователя или пароль');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography component="h1" variant="h5" align="center">
          Вход в систему
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Имя пользователя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            inputProps={{
              autoComplete: "current-password"
            }}
          />
          {error && (
            <Typography color="error" align="center" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Войти
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login; 