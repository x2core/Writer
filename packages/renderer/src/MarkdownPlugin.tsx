import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';

interface Props {
  markdown: string;
  onChange: (markdown: string) => void;
}

export function MarkdownPlugin({ markdown, onChange }: Props) {
  const [editor] = useLexicalComposerContext();

  // Load initial content only once when the component mounts (or remounts via key change)
  useEffect(() => {
    editor.update(() => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
    });
  }, [editor]);

  // Listen for changes
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const mdString = $convertToMarkdownString(TRANSFORMERS);
        onChange(mdString);
      });
    });
  }, [editor, onChange]);

  return null;
}