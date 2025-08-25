import { InputRule, textblockTypeInputRule } from 'prosemirror-inputrules';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import type { Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { MutableRefObject } from 'react';

import { buildContentFromDocument } from './functions';

// ProseMirror schema supporting basic document nodes and lists.
export const documentSchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: schema.spec.marks,
});

/**
 * Creates an input rule that converts leading `#` characters into heading
 * nodes. The schema's `heading` node is optional, so we guard against it being
 * absent to satisfy `exactOptionalPropertyTypes`.
 */
export function headingRule(level: number): InputRule {
  const heading = documentSchema.nodes.heading;
  if (!heading) {
    throw new Error('Heading node not defined in document schema');
  }

  return textblockTypeInputRule(
    new RegExp(`^(#{1,${level}})\\s$`),
    heading,
    () => ({ level }),
  );
}

/**
 * Applies a ProseMirror transaction and triggers a save callback whenever the
 * document changes. The debounce behaviour is controlled via transaction meta
 * flags `no-save` and `no-debounce`.
 */
export const handleTransaction = ({
  transaction,
  editorRef,
  onSaveContent,
}: {
  transaction: Transaction;
  editorRef: MutableRefObject<EditorView | null>;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
}) => {
  if (!editorRef || !editorRef.current) return;

  const newState = editorRef.current.state.apply(transaction);
  editorRef.current.updateState(newState);

  if (transaction.docChanged && !transaction.getMeta('no-save')) {
    const updatedContent = buildContentFromDocument(newState.doc);

    if (transaction.getMeta('no-debounce')) {
      onSaveContent(updatedContent, false);
    } else {
      onSaveContent(updatedContent, true);
    }
  }
};
