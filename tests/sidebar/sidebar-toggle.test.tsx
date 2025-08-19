import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

// Ensure the sidebar toggle calls the shared toggle handler when clicked.
test('sidebar toggle invokes handler', async () => {
  const toggleSidebar = mock.fn();
  // Mock the sidebar module used by the toggle button.
  mock.module('@/components/ui/sidebar', () => ({
    useSidebar: () => ({ toggleSidebar }),
  }));
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  // @ts-expect-error assign jsdom globals
  globalThis.window = dom.window as any;
  // @ts-expect-error assign jsdom globals
  globalThis.document = dom.window.document as any;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const { SidebarToggle } = await import('../../components/sidebar-toggle');
  createRoot(container).render(React.createElement(SidebarToggle));
  // Wait for the component to mount.
  await new Promise((r) => setTimeout(r, 0));
  (document.querySelector('[data-testid="sidebar-toggle-button"]') as HTMLButtonElement).click();
  assert.equal(toggleSidebar.mock.callCount(), 1);
});
