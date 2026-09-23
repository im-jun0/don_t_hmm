"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { TEXT } from "@/config";
import { addMyItem } from "@/lib/api";

export default function AddItemModal({
  actor,
  onClose,
  onAdded,
}: {
  actor: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [actorName, setActorName] = useState(actor);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const actorInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const trimmedActor = actorName.trim();
    const trimmedName = name.trim();
    if (!trimmedActor) {
      toast.error(TEXT.manage.actorRequired);
      actorInputRef.current?.focus();
      return;
    }
    if (!trimmedName) {
      toast.error(TEXT.manage.nameRequired);
      nameInputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addMyItem(trimmedActor, trimmedName);
      onAdded();
    } catch {
      setError(TEXT.addItem.saveFailed);
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{TEXT.addItem.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-4 flex flex-col gap-2"
        >
          <input
            ref={actorInputRef}
            value={actorName}
            onChange={(e) => setActorName(e.target.value)}
            placeholder={TEXT.manage.actorPlaceholder}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={TEXT.manage.namePlaceholder}
            autoFocus
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {TEXT.addItem.save}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
