import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import required external stylesheets
document.head.innerHTML += `
  <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
`;

// Create root element if it doesn't exist
if (!document.getElementById('root')) {
    const rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
}

// Create React root and render the App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);