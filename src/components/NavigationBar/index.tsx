import { useAccount } from '@azure/msal-react';
import {
  TopBar,
  TopBarTitle,
  FlexBox,
  Link,
  Text,
  Avatar,
} from '@filament/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { PersonPortrait, PhilipsLogo } from '@filament-icons/react';

import * as globalStyles from '../../global-styles.css';

export const NavigationBar = () => {
  const account = useAccount();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <TopBar>
      <TopBarTitle>
        <Link onPress={() => navigate('/')} noUnderline>
          <PhilipsLogo />
          <Text weight="bold">{t('app.shortTitle')}</Text>
        </Link>
      </TopBarTitle>
      <FlexBox justifyContent="flex-end" flex={1} marginEnd={6}>
        <Avatar>
          <PersonPortrait />
        </Avatar>
        <Text
          className={globalStyles.hideOnMobile}
          marginStart={8}
          weight="medium"
        >
          {account?.name ?? t('common.defaultUser')}
        </Text>
      </FlexBox>
    </TopBar>
  );
};
