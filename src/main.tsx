import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const el = window['document']['getElementById']('root');

if (el) {
  createRoot(el).render(<App />);
}
