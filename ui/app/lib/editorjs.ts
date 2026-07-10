export type EditorBlock = {
  type: string;
  data: Record<string, unknown>;
};

export type EditorData = {
  time?: number;
  blocks: EditorBlock[];
  version?: string;
};

const emptyEditorData = (): EditorData => ({ blocks: [] });

export function parseEditorData(value: string | null | undefined): EditorData {
  if (!value?.trim()) return emptyEditorData();

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "blocks" in parsed &&
      Array.isArray(parsed.blocks)
    ) {
      return parsed as EditorData;
    }
  } catch {
    // Legacy recipes stored instructions as plain text.
  }

  return {
    blocks: value
      .split(/\n+/)
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ type: "paragraph", data: { text } })),
  };
}

export function ingredientEditorData(
  ingredients: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    note?: string | null;
  }>,
): EditorData {
  if (ingredients.length === 0) return emptyEditorData();

  return {
    blocks: [
      {
        type: "list",
        data: {
          style: "unordered",
          items: ingredients.map((ingredient) =>
            [
              ingredient.quantity ?? "",
              ingredient.unit ?? "",
              ingredient.name,
              ingredient.note ? `(${ingredient.note})` : "",
            ]
              .filter(Boolean)
              .join(" "),
          ),
        },
      },
    ],
  };
}

export function editorIngredients(data: EditorData): Array<{ name: string }> {
  return data.blocks
    .filter((block) => block.type === "list")
    .flatMap((block) => {
      const items = block.data.items;
      if (!Array.isArray(items)) return [];
      return items
        .map((item) => {
          if (typeof item === "string") return item;
          if (typeof item === "object" && item !== null && "content" in item) {
            return typeof item.content === "string" ? item.content : "";
          }
          return "";
        })
        .map((item) => item.replace(/<[^>]+>/g, "").trim())
        .filter(Boolean)
        .map((name) => ({ name }));
    });
}

export function serializeEditorData(data: EditorData): string {
  return JSON.stringify({
    time: data.time ?? Date.now(),
    blocks: data.blocks,
    version: data.version ?? "2.31.0",
  });
}
