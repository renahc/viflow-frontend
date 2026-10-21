import { Trash2 } from "lucide-react";

type Props = { label: string; onClick: () => void };

export function DeleteButton({ label, onClick }: Props) {
  return (
    <button type="button" className="delete-button" aria-label={label} title={label} onClick={onClick} draggable={false}>
      <Trash2 size={14} strokeWidth={1.6} aria-hidden="true" />
    </button>
  );
}
