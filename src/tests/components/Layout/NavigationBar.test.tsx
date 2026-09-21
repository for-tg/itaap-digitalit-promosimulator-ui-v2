import { cleanup, render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  navigate: vi.fn(),
  account: { name: 'Jane Admin' },
}));

vi.mock('@azure/msal-react', () => ({
  useAccount: () => mockState.account,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockState.navigate,
}));

vi.mock('@filament/react', () => ({
  TopBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TopBarTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FlexBox: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Link: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => <button onClick={onPress}>{children}</button>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@filament-icons/react', () => ({
  PersonPortrait: () => <span>person</span>,
  PhilipsLogo: () => <span>logo</span>,
}));

vi.mock('~/global-styles.css', () => ({ hideOnMobile: 'hideOnMobile' }));

import { NavigationBar } from '~/components/NavigationBar';

afterEach(() => {
  cleanup();
  mockState.navigate.mockClear();
});

describe('NavigationBar', () => {
  it('navigates home and shows account name', async () => {
    render(<NavigationBar />);

    expect(screen.getByText('Jane Admin')).toBeInTheDocument();
    const homeLink = screen.getByText('app.shortTitle').closest('a');
    expect(homeLink).not.toBeNull();
    fireEvent.click(homeLink as HTMLAnchorElement);
    expect(mockState.navigate).toHaveBeenCalledWith('/');
  });
});