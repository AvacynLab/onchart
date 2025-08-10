import React from 'react';
import ListTileEmpty from './ListTileEmpty';

/**
 * Empty state wrapper for the analyses tile.
 *
 * @param message Localised text displayed when no analyses exist.
 */
export default function AnalysesTileEmpty({
  message,
}: {
  /** Localised empty state text */
  message: string;
}) {
  return <ListTileEmpty>{message}</ListTileEmpty>;
}
