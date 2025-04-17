import axios from 'axios';
import { API_URL } from '../config';

// Создаем экземпляр axios с базовым URL
const api = axios.create({
  baseURL: '/api'
});

export default api; 