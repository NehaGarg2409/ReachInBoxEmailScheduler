"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import clsx from "clsx";

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Type your reply...",
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[220px] px-1 py-2 focus:outline-none text-sm text-ink",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  return (
    <div className="rounded border border-paper-border bg-white">
      <EditorContent editor={editor} />
      <Toolbar editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const items: { label: React.ReactNode; onClick: () => void; active: boolean; title: string }[] = [
    { label: <UndoIcon />, onClick: () => editor.chain().focus().undo().run(), active: false, title: "Undo" },
    { label: <RedoIcon />, onClick: () => editor.chain().focus().redo().run(), active: false, title: "Redo" },
    { label: <b>B</b>, onClick: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), title: "Bold" },
    { label: <i>I</i>, onClick: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), title: "Italic" },
    { label: <u>U</u>, onClick: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), title: "Underline" },
    { label: <s>S</s>, onClick: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), title: "Strikethrough" },
    { label: "•", onClick: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), title: "Bullet list" },
    { label: "1.", onClick: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), title: "Numbered list" },
    { label: "❝", onClick: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), title: "Blockquote" },
  ];

  return (
    <div className="flex items-center gap-1 border-t border-paper-border px-2 py-1.5">
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          title={item.title}
          onClick={item.onClick}
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded text-sm text-muted hover:bg-paper",
            item.active && "bg-brand-soft text-brand"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
