import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Mengimpor komponen utama dari file App.js

// Membuat "root" yang menunjuk ke div#root di index.html
const root = ReactDOM.createRoot(document.getElementById('root'));

// Merender komponen App Anda di dalam root tersebut
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);