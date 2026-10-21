export type Column = { id: string; title: string; description: string };
export type Status = string;
export type Board = { columns: Column[]; cards: Card[] };

export const initialColumns: Column[] = [
  {
    id: "todo",
    title: "Por hacer",
    description: "Las próximas ideas toman forma.",
  },
  {
    id: "in-progress",
    title: "En progreso",
    description: "Un paso más cerca de lograrlo.",
  },
  {
    id: "done",
    title: "Hecho",
    description: "Pequeños avances, grandes resultados.",
  },
];

export type Card = {
  id: string;
  title: string;
  description: string;
  status: Status;
};

export const storageKey = "viflow.board.v2";
const legacyStorageKey = "viflow.board.v1";

const initialCards: Card[] = [
  {
    id: "idea",
    title: "Darle forma a una buena idea",
    description: "Todo empieza con un primer paso. ¿Qué te gustaría construir?",
    status: "todo",
  },
  {
    id: "inspiration",
    title: "Buscar un poco de inspiración",
    description: "Reúne referencias, explora posibilidades y conecta ideas.",
    status: "todo",
  },
  {
    id: "board",
    title: "Crear nuestro primer tablero",
    description: "Un espacio simple para organizar lo que viene.",
    status: "in-progress",
  },
  {
    id: "start",
    title: "Comenzar con viflow",
    description: "Ya tenemos un lugar para hacer que las cosas pasen.",
    status: "done",
  },
];

function isCard(value: unknown, columns: Column[]): value is Card {
  if (typeof value !== "object" || value === null) return false;

  const card = value as Record<string, unknown>;

  return (
    typeof card.id === "string" &&
    typeof card.title === "string" &&
    !!card.title.trim() &&
    typeof card.description === "string" &&
    columns.some((column) => column.id === card.status)
  );
}

function hasUniqueIds(items: { id: string }[]): boolean {
  return new Set(items.map(item => item.id)).size === items.length;
}

function isColumn(value: unknown): value is Column {
  if (typeof value !== "object" || value === null) return false;
  const column = value as Record<string, unknown>;
  return typeof column.id === "string" && !!column.id.trim()
    && typeof column.title === "string" && !!column.title.trim()
    && typeof column.description === "string";
}

export function loadBoard(): Board {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);
      if (typeof parsed === "object" && parsed !== null) {
        const board = parsed as Record<string, unknown>;
        if (Array.isArray(board.columns) && board.columns.length > 0
          && board.columns.every(isColumn) && hasUniqueIds(board.columns)
          && Array.isArray(board.cards)
          && board.cards.every(card => isCard(card, board.columns as Column[]))
          && hasUniqueIds(board.cards)) {
          return { columns: board.columns, cards: board.cards };
        }
      }
    }
    // Read the previous format without deleting it, preserving existing cards.
    const legacy = localStorage.getItem(legacyStorageKey);
    if (legacy !== null) {
      const cards: unknown = JSON.parse(legacy);
      if (Array.isArray(cards) && cards.every(card => isCard(card, initialColumns)) && hasUniqueIds(cards)) {
        return { columns: initialColumns, cards };
      }
    }
  } catch {
    /* Storage may be unavailable; the board still works in memory. */
  }
  return { columns: initialColumns, cards: initialCards };
}
