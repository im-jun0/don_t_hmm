"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { CARD_BACKGROUND_COLORS, TEXT } from "@/config";
import { deleteMyItem, setItemStyle, updateMyItem, uploadItemImage, type Row } from "@/lib/api";

const MAX_BYTES = 5 * 1024 * 1024;

type Style = { backgroundColor: string | null; backgroundImageUrl: string | null };
type Names = { actor: string; name: string };

export default function CardStyleEditor({
  row,
  isMine,
  onClose,
  onChange,
  onRename,
  onDelete,
}: {
  row: Row;
  /** 본인 항목일 때만 이름 수정/삭제를 보여줘요. 카드 꾸미기(색/이미지)는 기존대로 누구나 가능해요. */
  isMine: boolean;
  onClose: () => void;
  onChange: (patch: Style) => void;
  onRename: (patch: Names) => void;
  onDelete: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [actor, setActor] = useState(row.actor);
  const [name, setName] = useState(row.name);
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState("");
  const renameDirty = actor.trim() !== row.actor || name.trim() !== row.name;

  const saveRename = async () => {
    const trimmedActor = actor.trim();
    const trimmedName = name.trim();
    if (!trimmedActor || !trimmedName) return;
    setRenameBusy(true);
    setRenameError("");
    try {
      await updateMyItem(row.id, trimmedActor, trimmedName);
      onRename({ actor: trimmedActor, name: trimmedName });
    } catch {
      setRenameError(TEXT.cardStyle.saveFailed);
    } finally {
      setRenameBusy(false);
    }
  };

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteMyItem(row.id);
      onDelete();
    } catch {
      setDeleteError(TEXT.cardStyle.saveFailed);
      setDeleteBusy(false);
    }
  };

  const apply = async (style: Style) => {
    setBusy(true);
    setError("");
    try {
      await setItemStyle(row.id, style);
      onChange(style);
    } catch {
      setError(TEXT.cardStyle.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(TEXT.cardStyle.tooLarge);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const url = await uploadItemImage(row.id, file);
      await setItemStyle(row.id, { backgroundColor: null, backgroundImageUrl: url });
      onChange({ backgroundColor: null, backgroundImageUrl: url });
    } catch {
      setError(TEXT.cardStyle.saveFailed);
    } finally {
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
          <h2 className="text-lg font-semibold tracking-tight">{TEXT.cardStyle.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>

        {isMine && (
          <div className="mt-4">
            <p className="text-xs font-medium text-neutral-500">{TEXT.cardStyle.nameTitle}</p>
            <div className="mt-2 flex flex-col gap-2">
              <input
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder={TEXT.manage.actorPlaceholder}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={TEXT.manage.namePlaceholder}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              {renameError && <p className="text-sm text-red-600">{renameError}</p>}
              <button
                type="button"
                disabled={renameBusy || !renameDirty || !actor.trim() || !name.trim()}
                onClick={saveRename}
                className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
              >
                {TEXT.manage.save}
              </button>
            </div>
          </div>
        )}

        <p className="mt-5 text-xs font-medium text-neutral-500">{TEXT.cardStyle.colorTab}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {CARD_BACKGROUND_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              disabled={busy}
              aria-label={hex}
              onClick={() => apply({ backgroundColor: hex, backgroundImageUrl: null })}
              style={{ backgroundColor: hex }}
              className="h-8 w-8 rounded-full border border-black/10 transition active:scale-90 disabled:opacity-50"
            />
          ))}
          <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-neutral-300 text-neutral-400 hover:border-neutral-400">
            <input
              type="color"
              className="h-0 w-0 opacity-0"
              disabled={busy}
              onChange={(e) => apply({ backgroundColor: e.target.value, backgroundImageUrl: null })}
              title={TEXT.cardStyle.customColor}
            />
            +
          </label>
        </div>

        <p className="mt-5 text-xs font-medium text-neutral-500">{TEXT.cardStyle.imageTab}</p>
        <label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-neutral-400">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          {busy ? TEXT.cardStyle.uploading : TEXT.cardStyle.imageTab}
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          disabled={busy}
          onClick={() => apply({ backgroundColor: null, backgroundImageUrl: null })}
          className="mt-5 w-full rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
        >
          {TEXT.cardStyle.reset}
        </button>

        {isMine && (
          <div className="mt-5 border-t border-neutral-100 pt-4">
            {deleteError && <p className="mb-2 text-sm text-red-600">{deleteError}</p>}
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="w-full rounded-xl px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                {TEXT.manage.delete}
              </button>
            ) : (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-neutral-500">{TEXT.manage.deleteConfirm}</span>
                <span className="flex gap-3">
                  <button
                    type="button"
                    disabled={deleteBusy}
                    onClick={handleDelete}
                    className="font-semibold text-red-600 disabled:opacity-50"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    disabled={deleteBusy}
                    onClick={() => setConfirmingDelete(false)}
                    className="text-neutral-400"
                  >
                    ✕
                  </button>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
