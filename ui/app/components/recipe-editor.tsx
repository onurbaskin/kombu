import { useEffect, useId, useRef, useState } from "react";
import type { EditorData } from "~/lib/editorjs";

type RecipeEditorProps = {
  data: EditorData;
  onChange?: (data: EditorData) => void;
  readOnly?: boolean;
  placeholder?: string;
};

export function RecipeEditor({
  data,
  onChange,
  readOnly = false,
  placeholder = "Start writing...",
}: RecipeEditorProps) {
  const holderId = `recipe-editor-${useId().replace(/:/g, "")}`;
  const [ready, setReady] = useState(false);
  const initialData = useRef(data);

  useEffect(() => {
    let disposed = false;
    let editor: {
      isReady: Promise<void>;
      destroy: () => void | Promise<void>;
    } | null = null;

    async function mount() {
      const [editorModule, headerModule, listModule, quoteModule] =
        await Promise.all([
          import("@editorjs/editorjs"),
          import("@editorjs/header"),
          import("@editorjs/list"),
          import("@editorjs/quote"),
        ]);
      if (disposed) return;

      const EditorJS = editorModule.default;
      const instance = new EditorJS({
        holder: holderId,
        readOnly,
        data: initialData.current,
        placeholder,
        tools: {
          header: {
            class: headerModule.default,
            inlineToolbar: true,
            config: { levels: [2, 3, 4], defaultLevel: 2 },
          },
          list: { class: listModule.default, inlineToolbar: true },
          quote: { class: quoteModule.default, inlineToolbar: true },
        },
        onChange: async () => {
          if (!onChange || disposed) return;
          const saved = await instance.save();
          if (!disposed) onChange(saved as EditorData);
        },
      });
      editor = instance;
      await instance.isReady;
      if (!disposed) setReady(true);
    }

    void mount();
    return () => {
      disposed = true;
      setReady(false);
      if (editor) void editor.destroy();
    };
  }, [holderId, onChange, placeholder, readOnly]);

  return (
    <div
      className={`recipe-editor min-h-28 ${readOnly ? "recipe-editor-readonly" : "rounded-lg border bg-background px-3"}`}
    >
      {!ready && (
        <p className="py-4 text-muted-foreground text-sm">Loading editor…</p>
      )}
      <div id={holderId} />
    </div>
  );
}
