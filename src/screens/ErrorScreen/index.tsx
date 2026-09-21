import { Text } from '@filament/react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

export const ErrorScreen = () => {
  const error = useRouteError();
  const { t } = useTranslation();
  let errorMessage: string;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = t('errors.unknown');
  }
  console.error(error);

  return (
    <>
      <Text elementType="p">{t('errors.unexpected')}</Text>
      <Text elementType="p">{errorMessage}</Text>
    </>
  );
};
