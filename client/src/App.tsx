import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import DataTable from './components/DataTable';
import Login from './components/Login';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

// Компонент для защищенных маршрутов
const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const user = localStorage.getItem('user');
  return user ? element : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Container maxWidth="xl">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute element={<DataTable />} />} />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
}

export default App;
