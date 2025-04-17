import React from 'react';
import { Button, Stack, Typography, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import api from '../api/axios';

interface ExportButtonsProps {
  selectedIds?: string[];
  filter?: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ selectedIds, filter }) => {
  // Функция для скачивания всех данных в PDF
  const handleExportAllToPdf = async () => {
    try {
      console.log('Начинаем экспорт всех данных в PDF');
      // URL с фильтром, если он есть
      const url = filter 
        ? `/data/export/pdf?filter=${encodeURIComponent(filter)}`
        : '/data/export/pdf';
      
      console.log('URL запроса:', url);

      // Запрос для скачивания PDF
      console.log('Отправляем запрос...');
      const response = await api({
        url,
        method: 'GET',
        responseType: 'blob' // Важно для бинарных данных
      });
      
      console.log('Ответ получен:', response.status, response.statusText);
      console.log('Размер полученных данных:', response.data.size);

      // Создаем ссылку для скачивания файла
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      console.log('Файл скачивается...');
    } catch (error: any) {
      console.error('Ошибка при экспорте в PDF:', error);
      if (error.response) {
        console.error('Ответ сервера:', error.response.status, error.response.statusText);
      }
      alert('Произошла ошибка при экспорте в PDF. Пожалуйста, попробуйте еще раз.');
    }
  };

  // Функция для скачивания выбранных записей в PDF
  const handleExportSelectedToPdf = async () => {
    if (!selectedIds || selectedIds.length === 0) {
      alert('Пожалуйста, выберите записи для экспорта');
      return;
    }

    try {
      console.log('Начинаем экспорт выбранных записей:', selectedIds);
      
      // Запрос для скачивания PDF выбранных записей
      const url = '/data/export/selected-pdf';
      console.log('URL запроса:', url);
      console.log('Данные запроса:', { ids: selectedIds });
      
      console.log('Отправляем запрос...');
      const response = await api({
        url,
        method: 'POST',
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        },
        data: { ids: selectedIds }
      });
      
      console.log('Ответ получен:', response.status, response.statusText);
      console.log('Размер полученных данных:', response.data.size);

      // Создаем ссылку для скачивания файла
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `selected-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      console.log('Файл скачивается...');
    } catch (error: any) {
      console.error('Ошибка при экспорте в PDF:', error);
      if (error.response) {
        console.error('Ответ сервера:', error.response.status, error.response.statusText);
      }
      alert('Произошла ошибка при экспорте в PDF. Пожалуйста, попробуйте еще раз.');
    }
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
      <Typography variant="subtitle1">Экспорт данных:</Typography>
      
      <Tooltip title="Экспортировать все данные в PDF">
        <Button 
          variant="outlined" 
          startIcon={<PictureAsPdfIcon />}
          onClick={handleExportAllToPdf}
        >
          Все данные в PDF
        </Button>
      </Tooltip>
      
      <Tooltip title="Экспортировать выбранные записи в PDF">
        <span>
          <Button 
            variant="outlined" 
            startIcon={<FileDownloadIcon />}
            onClick={handleExportSelectedToPdf}
            disabled={!selectedIds || selectedIds.length === 0}
          >
            Выбранные записи в PDF
          </Button>
        </span>
      </Tooltip>
    </Stack>
  );
};

export default ExportButtons; 