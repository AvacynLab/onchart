import React from 'react';
import ListTileEmpty from './ListTileEmpty';

/**
 * Empty state wrapper for the Strategies tile.
 *
 * @param message Localised text to display when no strategies exist.
 */
export default function StrategiesTileEmpty({
  message,
}: {
  /** Localised empty state text */
  message: string;
}) {
  return <ListTileEmpty>{message}</ListTileEmpty>;
}
