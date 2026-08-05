import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Trash2,
  Undo2,
  Unlink2,
} from "lucide-react";

const ArticleImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => attributes.width ? { width: attributes.width } : {},
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => attributes.height ? { height: attributes.height } : {},
      },
    };
  },
});

const extensions = [
  StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: { rel: "noopener noreferrer" },
  }),
  ArticleImage.configure({ inline: false, allowBase64: false }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
];

export default function RichTextEditor({ contentKey, html, json, onChange, onUploadImage, onStatus }) {
  const fileInputRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({ words: countWordsFromHTML(html), links: 0 });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions,
    content: editorContent(json, html),
    editorProps: {
      attributes: {
        class: "rich-text-editor__content",
        dir: "rtl",
        spellcheck: "true",
      },
    },
    onCreate: ({ editor: current }) => setStats(editorStats(current)),
    onUpdate: ({ editor: current }) => {
      setStats(editorStats(current));
      onChangeRef.current?.({ html: current.getHTML(), json: current.getJSON() });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextHTML = html || "";
    if (editor.getHTML() === nextHTML || (!nextHTML && editor.isEmpty)) return;
    editor.commands.setContent(editorContent(json, nextHTML), false);
    setStats(editorStats(editor));
  }, [contentKey, editor, html, json]);

  if (!editor) {
    return <div className="grid min-h-[420px] place-items-center border border-[#d9cfc5] bg-white"><Loader2 className="h-5 w-5 animate-spin text-[#a05f62]" /></div>;
  }

  const setLink = () => {
    const current = editor.getAttributes("link").href || "/";
    const href = window.prompt("آدرس لینک داخلی یا کامل را وارد کنید:", current);
    if (href === null) return;
    const normalized = href.trim();
    if (!normalized) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!isSafeLink(normalized)) {
      onStatus?.({ type: "error", message: "لینک باید داخلی، https، ایمیل، تلفن یا anchor باشد." });
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadImage) return;
    const alt = window.prompt("متن جایگزین تصویر را بنویسید:", "");
    if (alt === null) return;
    if (!alt.trim()) {
      onStatus?.({ type: "error", message: "برای تصویر داخل مقاله، متن جایگزین لازم است." });
      return;
    }
    const insertionPosition = editor.state.selection.anchor;
    setUploading(true);
    try {
      const image = await onUploadImage(file, alt.trim());
      if (!image) return;
      if (!image.url) {
        onStatus?.({ type: "error", message: "آدرس تصویر از سرور دریافت نشد؛ تصویر داخل متن درج نشد." });
        return;
      }
      const source = preferredImageSource(image);
      const maxPosition = editor.state.doc.content.size;
      editor.chain().focus().setTextSelection(Math.min(insertionPosition, maxPosition)).setImage({
        src: source.url,
        alt: image.alt || alt.trim(),
        width: image.width || null,
        height: image.height || null,
      }).run();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rich-text-editor" dir="rtl">
      <div className="rich-text-editor__toolbar" role="toolbar" aria-label="ابزارهای ویرایش مقاله">
        <ToolbarButton label="پررنگ" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></ToolbarButton>
        <ToolbarButton label="ایتالیک" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></ToolbarButton>
        <ToolbarButton label="خط‌خورده" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough /></ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="تیتر سطح دو" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></ToolbarButton>
        <ToolbarButton label="تیتر سطح سه" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 /></ToolbarButton>
        <ToolbarButton label="تیتر سطح چهار" active={editor.isActive("heading", { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}><Heading4 /></ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="فهرست نشانه‌دار" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></ToolbarButton>
        <ToolbarButton label="فهرست شماره‌دار" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolbarButton>
        <ToolbarButton label="نقل‌قول" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote /></ToolbarButton>
        <ToolbarButton label="بلوک کد" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 /></ToolbarButton>
        <ToolbarButton label="خط جداکننده" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus /></ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="افزودن یا ویرایش لینک" active={editor.isActive("link")} onClick={setLink}><Link2 /></ToolbarButton>
        <ToolbarButton label="حذف لینک" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink2 /></ToolbarButton>
        <ToolbarButton label="آپلود و درج تصویر" disabled={uploading} onClick={() => fileInputRef.current?.click()}>{uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}</ToolbarButton>
        <ToolbarButton label="درج جدول ۳ در ۳" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 /></ToolbarButton>
        {editor.isActive("table") ? <ToolbarButton label="حذف جدول" onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 /></ToolbarButton> : null}
        <ToolbarDivider />
        <ToolbarButton label="بازگشت" disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}><Undo2 /></ToolbarButton>
        <ToolbarButton label="انجام دوباره" disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}><Redo2 /></ToolbarButton>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadImage} />
      </div>
      <EditorContent editor={editor} />
      <div className="rich-text-editor__stats"><span>{stats.words.toLocaleString("fa-IR")} واژه</span><span>{stats.links.toLocaleString("fa-IR")} لینک</span></div>
    </div>
  );
}

function ToolbarButton({ label, active = false, disabled = false, onClick, children }) {
  return <button type="button" className={`rich-text-editor__button ${active ? "is-active" : ""}`} title={label} aria-label={label} aria-pressed={active || undefined} disabled={disabled} onClick={onClick}>{children}</button>;
}

function ToolbarDivider() {
  return <span className="rich-text-editor__divider" aria-hidden="true" />;
}

function editorContent(json, html) {
  if (json && json.type === "doc" && Array.isArray(json.content)) return json;
  return html || "";
}

function editorStats(editor) {
  const text = editor.getText().trim();
  return {
    words: text ? text.split(/\s+/u).filter(Boolean).length : 0,
    links: countLinks(editor.getHTML()),
  };
}

function countWordsFromHTML(html = "") {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
  return text ? text.split(/\s+/u).filter(Boolean).length : 0;
}

function countLinks(html = "") {
  return (html.match(/<a\b/gi) || []).length;
}

function isSafeLink(href) {
  return /^(\/(?!\/)|https:\/\/|mailto:|tel:|#)/i.test(href);
}

function preferredImageSource(image) {
  const sources = [...(image.sources || [])].sort((first, second) => first.width - second.width);
  return sources.find((source) => source.width >= 960) || sources.at(-1) || { url: image.url };
}
