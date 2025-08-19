import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { vi, expect, test, beforeEach, afterEach } from 'vitest';

// Mock Next.js router to track navigation.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  // Provide the grid element so fade-out logic can attach the class.
  document.body.innerHTML = '<div id="bento-content"></div>';
  // Stub network call for chat creation.
  global.fetch = vi.fn(async () => ({ ok: true })) as any;
});

// Ensure the dock renders the shared MultimodalInput and triggers navigation
// to a new chat when submitting a message.
test('submits message and redirects to chat', async () => {
  const { ChatDock } = await import('../../components/bento/ChatDock');
  render(<ChatDock />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
  fireEvent.click(screen.getByTestId('send-button'));

  await waitFor(() => expect(global.fetch).toHaveBeenCalled());

  const router = require('next/navigation').useRouter();
  expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/chat\/[^/]+$/));
  expect(document.getElementById('bento-content')?.classList.contains('fading-out')).toBe(
    true,
  );
});
