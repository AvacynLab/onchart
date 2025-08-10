import React from 'react';
import ListTileEmpty from './ListTileEmpty';

/**
 * Empty state wrapper for the News tile.
 *
 * @param message Localised message to display when no news items exist.
 */
export default function NewsTileEmpty({
  message,
}: {
  /** Localised empty state text */
  message: string;
}) {
  return <ListTileEmpty>{message}</ListTileEmpty>;
}
