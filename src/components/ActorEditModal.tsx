"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { TEXT } from "@/config";
import { deleteMyActor, renameMyActor } from "@/lib/api";

/**
 * 행위자 이름 바꾸기 / 통째로 지우기.
 *
 * 행위자는 따로 테이블이 없고 items.actor 값이라, 이름을 바꾸면 그 묶음의 카드 전부가 같이 바뀌어요.
 * 지우면 그 안의 카드와 쌓인 기록까지 사라져서, 몇 개가 사라지는지 먼저 보여주고 한 번 더 물어봐요.
 */
export default function ActorEditModal({
  actor,
  itemCount,
  onClose,
  onDone,
}: {
  actor: string;
  /** 이 행위자에 달린 카드 수. 삭제 경고에 그대로 보여줘요. */
  itemCount: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(actor);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const next = name.trim();
    if (!next) {
      toast.error(TEXT.manage.actorRequired);
      inputRef.current?.focus();
      return;
    }
    if (next === actor) {
      onClose();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await renameMyActor(actor, next);
      toast.success(TEXT.actorEdit.renamed);
      onDone();
    } catch {
      setError(TEXT.actorEdit.renameFailed);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteMyActor(actor);
      toast.success(TEXT.actorEdit.deleted(actor));
      onDone();
    } catch {
      setError(TEXT.actorEdit.deleteFailed);
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
          <h2 className="text-lg font-semibold tracking-tight">{TEXT.actorEdit.title}</h2>
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
          <label className="text-xs text-neutral-500">{TEXT.actorEdit.nameLabel}</label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={TEXT.manage.actorPlaceholder}
            autoFocus
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {TEXT.actorEdit.save}
          </button>
        </form>

        <div className="mt-5 border-t border-neutral-100 pt-4">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="w-full rounded-xl px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              {TEXT.actorEdit.delete}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="break-keep text-sm text-neutral-600">
                {TEXT.actorEdit.deleteWarn(itemCount)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={remove}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {TEXT.manage.delete}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 disabled:opacity-50"
                >
                  {TEXT.manage.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
