import { InteractionType } from '@azure/msal-browser';
import { MsalAuthenticationTemplate } from '@azure/msal-react';
import { Portal } from '@filament/react';
import { atomicBackgroundPrimary, base } from '@filament/react/styles';
import { blue, light, medium } from '@filament/react/themes';
import clsx from 'clsx';
import { RouterProvider } from 'react-router-dom';

import { ThemeProvider } from './contexts/ThemeContext';
import { ProjectsProvider } from './contexts/ProjectsContext';
import { SimulatorProvider } from './contexts/SimulatorContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes';
import { appConfigs } from './utils/appConfig';
import { loginRequest } from './utils/msalConfig';

export const App = () => {
  return (
    <div className={clsx(blue, light, medium, base, atomicBackgroundPrimary)}>
      <Portal>
        <ErrorBoundary>
          <ThemeProvider>
            <ProjectsProvider>
              <SimulatorProvider>
                {/* authenticationRequest ensures the API scope (MSAL_SCOPE) is
                    requested during login, so acquireTokenSilent works immediately */}
                {appConfigs.ENABLE_SSO === true ? (
                  <MsalAuthenticationTemplate
                    interactionType={InteractionType.Redirect}
                    authenticationRequest={loginRequest}
                  >
                    <RouterProvider router={router} />
                  </MsalAuthenticationTemplate>
                ) : (
                  <RouterProvider router={router} />
                )}
              </SimulatorProvider>
            </ProjectsProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </Portal>
    </div>
  );
};
