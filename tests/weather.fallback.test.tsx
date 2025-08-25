import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Weather, SAMPLE } from '@/components/weather';

// Ensures the Weather component remains resilient when sunrise or sunset
// data are missing by verifying server-side rendering still produces HTML.
test('renders even if sunrise and sunset are missing', () => {
  const data = {
    ...SAMPLE,
    daily: { ...SAMPLE.daily, sunrise: [], sunset: [] },
  };
  const html = renderToString(<Weather weatherAtLocation={data} />);
  assert.ok(html);
});
