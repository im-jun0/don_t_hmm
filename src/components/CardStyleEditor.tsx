"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { CARD_BACKGROUND_COLORS, TEXT } from "@/config";
import { setItemStyle, uploadItemImage, type Row } from "@/lib/api";

const MAX_BYTES = 5 * 1024 * 1024;

type Style = { backgroundColor: string | null; backgroundImageUrl: string | null };

export default function CardStyleEditor({
  row,
  onClose,
  onChange,
}: {
  row: Row;
  onClose: () => void;
  onChange: (patch: Style) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

        <p className="mt-4 text-xs font-medium text-neutral-500">{TEXT.cardStyle.colorTab}</p>
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
      </div>
    </div>,
    document.body
  );
}
