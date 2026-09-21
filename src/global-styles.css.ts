import { style } from '@vanilla-extract/css';

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1200,
} as const;

export const hideOnDesktop = style({
  '@media': {
    [`(min-width: ${BREAKPOINTS.desktop}px)`]: {
      display: 'none !important',
    },
  },
});

export const hideOnMobile = style({
  '@media': {
    [`(max-width: ${BREAKPOINTS.tablet - 1}px) `]: {
      display: 'none !important',
    },
  },
});

export const showOnDesktop = style({
  '@media': {
    [`(max-width: ${BREAKPOINTS.desktop - 1}px)`]: {
      display: 'none !important',
    },
  },
});
