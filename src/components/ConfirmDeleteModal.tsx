import { useEffect, useRef } from "react";

type Props = {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({ title, description, onCancel, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-modal"
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-description"
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCancel();
      }}
    >
      <h2 id="confirm-delete-title">{title}</h2>
      <p id="confirm-delete-description">{description}</p>
      <div className="confirm-modal-actions">
        <button type="button" className="modal-cancel" autoFocus onClick={onCancel}>Cancelar</button>
        <button type="button" className="modal-delete" onClick={onConfirm}>Eliminar</button>
      </div>
    </dialog>
  );
}
