import { Text } from '@filament/react';
import { useTranslation } from 'react-i18next';
import {
  atomicBackgroundSecondary,
  atomicBorderTop,
} from '@filament/react/styles';
import clsx from 'clsx';

const currentYear = new Date().getUTCFullYear();

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className={clsx(atomicBackgroundSecondary, atomicBorderTop)}>
      <Text variant="reference-m" textAlign="center" elementType="p" hasGutter>
        {t('footer.copyright', { year: currentYear })}
      </Text>
    </footer>
  );
};
