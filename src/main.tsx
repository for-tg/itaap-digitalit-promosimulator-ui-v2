import { MsalProvider } from '@azure/msal-react';
import '@filament/react/fonts/latin';
import ReactDOM from 'react-dom/client';

import '~/styles/global.css';

import { App } from './App';
import './i18n/i18n';
import { msalInstance } from './utils/msalConfig';


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <MsalProvider instance={msalInstance}>
    <App />
  </MsalProvider>
);
