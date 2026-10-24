import { isChecklist } from './checklist.ts';
import type { ChecklistItem } from './checklist';
import { isDueDate, isPriority } from './cardSchedule.ts';
import type { Priority } from './cardSchedule.ts';
import { isCardActivity, isCardComment } from "./cardActivity.ts";
import type { CardActivity, CardComment } from "./cardActivity.ts";
import { isLabel, isLabelColor } from "./labels.ts";
import type { Label, LabelColor } from "./labels.ts";

export type Column = { id: string; title: string; description: string; color?: LabelColor; sort?: 'manual' | 'priority' };
export type Status = string;
export type Board = { columns: Column[]; cards: Card[]; labels?: Label[] };

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
  checklist?: ChecklistItem[];
  archivedAt?: string;
  id: string;
  title: string;
  description: string;
  status: Status;
  dueDate?: string;
  priority?: Priority;
  labelIds?: string[];
  comments?: CardComment[];
  activity?: CardActivity[];
};

export const storageKey = "viflow.board.v2";


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
    (card.checklist === undefined || isChecklist(card.checklist)) &&
    (card.archivedAt === undefined || (typeof card.archivedAt === "string" && Number.isFinite(Date.parse(card.archivedAt)))) &&
    (card.dueDate === undefined || isDueDate(card.dueDate)) &&
    (card.priority === undefined || isPriority(card.priority)) &&
    typeof card.id === "string" && !!card.id.trim() &&
    typeof card.title === "string" &&
    !!card.title.trim() &&
    typeof card.description === "string" &&
    columns.some((column) => column.id === card.status) &&
    (card.comments === undefined || (Array.isArray(card.comments) && card.comments.every(isCardComment) && hasUniqueIds(card.comments))) &&
    (card.activity === undefined || (Array.isArray(card.activity) && card.activity.every(isCardActivity) && hasUniqueIds(card.activity)))
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
    && typeof column.description === "string"
    && (column.sort === undefined || column.sort === 'manual' || column.sort === 'priority')
    && (column.color === undefined || isLabelColor(column.color));
}

export function isBoard(value: unknown): value is Board {
  if (typeof value !== "object" || value === null) return false;
  const board = value as Record<string, unknown>;
  return Array.isArray(board.columns) && board.columns.every(isColumn)
    && hasUniqueIds(board.columns) && Array.isArray(board.cards)
    && board.cards.every(card => isCard(card, board.columns as Column[]))
    && hasUniqueIds(board.cards)
    && (board.labels === undefined || (Array.isArray(board.labels) && board.labels.every(isLabel) && hasUniqueIds(board.labels)))
    && board.cards.every(card => card.labelIds === undefined || (
      Array.isArray(card.labelIds) && new Set(card.labelIds).size === card.labelIds.length
      && card.labelIds.every((id: unknown) => typeof id === "string"
        && Array.isArray(board.labels) && board.labels.some(label => label.id === id))
    ));
}

export function createInitialBoard(): Board {
  return { columns: initialColumns.map(column => ({ ...column })), cards: initialCards.map(card => ({ ...card })) }
}
