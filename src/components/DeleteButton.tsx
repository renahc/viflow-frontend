type Props = { label: string; onClick: () => void };

export function DeleteButton({ label, onClick }: Props) {
  return (
    <button type="button" className="delete-button" aria-label={label} title={label} onClick={onClick} draggable={false}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
      </svg>
    </button>
  );
}
