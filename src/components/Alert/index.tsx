import {
  Button,
  Dialog,
  DialogActions,
  DialogContainer,
  DialogContent,
  DialogTitle,
} from '@filament/react';

import * as styles from './styles.css';

interface AlertProps {
  title: string;
  message: string;
  isVisible: boolean;
  positiveButtonTitle: string;
  onPositiveButtonPress: () => void;
  negativeButtonTitle?: string;
  onNegativeButtonPress?: () => void;
}

export const Alert = (props: AlertProps) => {
  return (
    <DialogContainer
      onDismiss={props.onNegativeButtonPress ?? props.onPositiveButtonPress}
    >
      {props.isVisible && (
        <Dialog maxWidth="70%" minWidth="40%" maxHeight="80%">
          <DialogTitle>{props.title}</DialogTitle>
          <DialogContent className={styles.content}>
            {props.message}
          </DialogContent>
          <DialogActions>
            {props.negativeButtonTitle && (
              <Button variant="quiet" onPress={props.onNegativeButtonPress}>
                {props.negativeButtonTitle}
              </Button>
            )}
            <Button variant="primary" onPress={props.onPositiveButtonPress}>
              {props.positiveButtonTitle}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </DialogContainer>
  );
};
