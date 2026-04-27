import Editor, { OnMount } from '@monaco-editor/react';
import { useRef } from 'react';

interface JavaEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string | number;
  /** Label shown above the read-only banner when readOnly=true */
  readOnlyLabel?: string;
}

export function JavaEditor({ value, onChange, readOnly = false, height = 320, readOnlyLabel }: JavaEditorProps) {
  const editorRef = useRef<any>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-none">
      {readOnly && readOnlyLabel && (
        <div className="flex items-center gap-2 border-b border-yellow-600/30 bg-yellow-500/10 px-3 py-1.5 text-[11px] font-mono text-yellow-400">
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7a5 5 0 00-10 0v4" />
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          </svg>
          {readOnlyLabel}
        </div>
      )}
      <Editor
        height={height}
        defaultLanguage="java"
        value={value}
        onChange={(v) => !readOnly && onChange?.(v ?? '')}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineHeight: 22,
          lineNumbers: 'on',
          automaticLayout: true,
          wordWrap: 'on',
          tabSize: 4,
          insertSpaces: true,
          renderLineHighlight: readOnly ? 'none' : 'line',
          cursorStyle: readOnly ? 'underline' : 'line',
          scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
          padding: { top: 12, bottom: 12 },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: !readOnly,
          parameterHints: { enabled: !readOnly },
        }}
      />
    </div>
  );
}
