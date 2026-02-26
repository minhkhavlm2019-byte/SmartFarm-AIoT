import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Import CSS toàn cục (đã copy từ style.css cũ vào đây)
import './assets/css/index.css'; 
import './assets/css/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode giúp phát hiện lỗi tiềm ẩn trong quá trình dev (có thể làm useEffect chạy 2 lần ở dev mode)
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);