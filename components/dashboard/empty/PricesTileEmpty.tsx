import React from 'react';
import ListTileEmpty from './ListTileEmpty';

/**
 * Empty state for the Current Prices tile. The message is injected so callers
 * can localize it via their own translation mechanism.
 */
export default function PricesTileEmpty({ message }: { message: string }) {
  return <ListTileEmpty>{message}</ListTileEmpty>;
}
