'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Minus } from 'lucide-react';

interface RichTextEditorProps {
  value: string | null;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minHeight = '120px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value ?? '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'ProseMirror text-sm text-gray-700 focus:outline-none',
        'data-placeholder': placeholder,
      },
    },
  });

  // Sync external value changes (e.g. switching customers)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value ?? '';
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? 'bg-[#364570] text-white' : 'text-gray-500 hover:bg-gray-100'}`;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#364570]/30 focus-within:border-[#364570]">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50 flex-wrap">
        <button type="button" title="Bold" className={btn(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" title="Italic" className={btn(editor.isActive('italic'))}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <button type="button" title="Heading 2" className={btn(editor.isActive('heading', { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button type="button" title="Heading 3" className={btn(editor.isActive('heading', { level: 3 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <button type="button" title="Bullet list" className={btn(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </button>
        <button type="button" title="Ordered list" className={btn(editor.isActive('orderedList'))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <button type="button" title="Horizontal rule"
          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 transition-colors"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editor */}
      <div
        className="px-3 py-2 cursor-text"
        style={{ minHeight }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
