import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';

const THEME_STORAGE_KEY = 'agrovisionTheme';
const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
const initialTheme =
  savedTheme === 'light' || savedTheme === 'dark'
    ? savedTheme
    : window.matchMedia?.('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';

document.documentElement.dataset.theme = initialTheme;
document.documentElement.style.colorScheme = initialTheme;

createRoot(document.getElementById('root')).render(
  <App />
);
