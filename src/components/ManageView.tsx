"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TEXT } from "@/config";
import {
  deleteItem,
  deleteUser,
  fetchSnapshot,
  fetchUsers,
  upsertItem,
  upsertUser,
  verifyPin,
  type Row,
  type UserRow,
} from "@/lib/api";
import { useSelectedUser } from "@/lib/useSelectedUser";

const PIN_KEY = "dh_manage_pin";

function UserListRow({
  u,
  selected,
  onSelect,
  onRename,
  onDelete,
}: {
  u: UserRow;
  selected: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(u.name);

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setEditing(false);
              onRename(draft);
            }
            if (e.key === "Escape") {
              setDraft(u.name);
              setEditing(false);
            }
          }}
          onBlur={() => {
            setEditing(false);
            onRename(draft);
          }}
          className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={onSelect}
        className={
          "flex-1 truncate text-left text-sm font-medium " +
          (selected ? "text-neutral-900" : "text-neutral-600")
        }
      >
        {u.name}
        {selected && <span className="ml-2 text-xs text-neutral-400">선택됨</span>}
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs font-medium text-neutral-400 hover:text-neutral-700"
      >
        수정
      </button>
      <ConfirmDelete onConfirm={onDelete} />
    </div>
  );
}

function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-neutral-400 hover:text-red-600"
      >
        {TEXT.manage.delete}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-neutral-500">{TEXT.manage.deleteConfirm}</span>
      <button type="button" onClick={onConfirm} className="font-semibold text-red-600">
        ✓
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-neutral-400">
        ✕
      </button>
    </span>
  );
}

export default function ManageView() {
  const { user, selectUser } = useSelectedUser();
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [checking, setChecking] = useState(true);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newItem, setNewItem] = useState({ actor: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const newUserNameRef = useRef<HTMLInputElement>(null);
  const newItemActorRef = useRef<HTMLInputElement>(null);
  const newItemNameRef = useRef<HTMLInputElement>(null);

  const reloadUsers = useCallback(() => fetchUsers().then(setUsers).catch(() => {}), []);
  const reloadItems = useCallback(async (target: string | null) => {
    const snap = await fetchSnapshot(target);
    setItems(snap.rows ?? []);
    setUserId(snap.userId);
  }, []);

  /* ── PIN 확인 ── */
  useEffect(() => {
    let stored = "";
    try {
      stored = sessionStorage.getItem(PIN_KEY) ?? "";
    } catch {
      // ignore
    }
    if (!stored) {
      setChecking(false);
      return;
    }
    verifyPin(stored)
      .then((ok) => {
        if (ok) setPin(stored);
        else {
          try {
            sessionStorage.removeItem(PIN_KEY);
          } catch {
            // ignore
          }
        }
      })
      .finally(() => setChecking(false));
  }, []);

  const submitPin = async () => {
    setPinError(false);
    const ok = await verifyPin(pinInput).catch(() => false);
    if (ok) {
      setPin(pinInput);
      setPinInput("");
      try {
        sessionStorage.setItem(PIN_KEY, pinInput);
      } catch {
        // ignore
      }
    } else {
      setPinError(true);
    }
  };

  /* ── 목록 로딩 (PIN 확인 후) ── */
  useEffect(() => {
    if (!pin) return;
    reloadUsers();
  }, [pin, reloadUsers]);

  useEffect(() => {
    if (!pin) return;
    reloadItems(user).catch(() => {});
  }, [pin, user, reloadItems]);

  /** PIN 거부되면(만료/변경) 다시 잠그고 안내 */
  const onWriteFailed = () => {
    setSaveError(TEXT.manage.saveFailed);
    setPin("");
    try {
      sessionStorage.removeItem(PIN_KEY);
    } catch {
      // ignore
    }
  };

  const withPin = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setSaveError("");
    try {
      await fn();
    } catch {
      onWriteFailed();
    } finally {
      setBusy(false);
    }
  };

  /* ── 사용자 ── */
  const addUser = () => {
    const name = newUserName.trim();
    if (!name) {
      toast.error(TEXT.manage.userNameRequired);
      newUserNameRef.current?.focus();
      return;
    }
    return withPin(async () => {
      await upsertUser(pin, { id: null, name, sortOrder: users.length });
      setNewUserName("");
      await reloadUsers();
    });
  };

  const renameUser = (u: UserRow, name: string) =>
    withPin(async () => {
      if (!name.trim() || name === u.name) return;
      await upsertUser(pin, { id: u.id, name: name.trim(), sortOrder: u.sortOrder });
      await reloadUsers();
    });

  const removeUser = (u: UserRow) =>
    withPin(async () => {
      await deleteUser(pin, u.id);
      if (user === u.name) selectUser(null);
      await reloadUsers();
    });

  /* ── 항목 ── */
  const addItem = () => {
    if (!userId) return;
    const actor = newItem.actor.trim();
    const name = newItem.name.trim();
    if (!actor) {
      toast.error(TEXT.manage.actorRequired);
      newItemActorRef.current?.focus();
      return;
    }
    if (!name) {
      toast.error(TEXT.manage.nameRequired);
      newItemNameRef.current?.focus();
      return;
    }
    return withPin(async () => {
      await upsertItem(pin, { id: null, userId, actor, name, count: 0, sortOrder: items.length });
      setNewItem({ actor: "", name: "" });
      await reloadItems(user);
    });
  };

  const saveItem = (row: Row, patch: Partial<{ actor: string; name: string; count: number }>) =>
    withPin(async () => {
      if (!userId) return;
      const actor = (patch.actor ?? row.actor).trim();
      const name = (patch.name ?? row.name).trim();
      if (!actor || !name) return;
      await upsertItem(pin, {
        id: row.id,
        userId,
        actor,
        name,
        count: patch.count ?? row.count,
        sortOrder: row.sortOrder,
      });
      await reloadItems(user);
    });

  const removeItem = (row: Row) =>
    withPin(async () => {
      await deleteItem(pin, row.id);
      await reloadItems(user);
    });

  /* ── 화면 ── */
  if (checking) return null;

  if (!pin) {
    return (
      <main className="mx-auto max-w-sm px-5 pb-16 pt-14">
        <h1 className="text-2xl font-semibold tracking-tight">{TEXT.manage.pinPrompt}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitPin();
          }}
          className="mt-6 flex gap-2"
        >
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder={TEXT.manage.pinPlaceholder}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            {TEXT.manage.pinSubmit}
          </button>
        </form>
        {pinError && <p className="mt-2 text-sm text-red-600">{TEXT.manage.pinWrong}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-14">
      {saveError && (
        <p className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">{saveError}</p>
      )}

      {/* 사용자 관리 */}
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">{TEXT.manage.usersTitle}</h1>
        <div className="mt-4 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
          {users.map((u) => (
            <UserListRow
              key={u.id}
              u={u}
              selected={user === u.name}
              onSelect={() => selectUser(u.name)}
              onRename={(name) => renameUser(u, name)}
              onDelete={() => removeUser(u)}
            />
          ))}
          {users.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">{TEXT.emptyAll}</p>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addUser();
          }}
          className="mt-3 flex gap-2"
        >
          <input
            ref={newUserNameRef}
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder={TEXT.manage.userNamePlaceholder}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
          >
            {TEXT.manage.addUser}
          </button>
        </form>
      </section>

      {/* 항목 관리 */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">{TEXT.manage.itemsTitle}</h2>

        {!userId ? (
          <p className="mt-4 rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
            {TEXT.manage.noUserSelected}
          </p>
        ) : (
          <>
            <div className="mt-4 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
              {items.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <input
                    defaultValue={row.actor}
                    onBlur={(e) => saveItem(row, { actor: e.target.value })}
                    className="w-24 shrink-0 rounded-lg border border-transparent bg-neutral-50 px-2 py-1 text-sm focus:border-neutral-300"
                  />
                  <input
                    defaultValue={row.name}
                    onBlur={(e) => saveItem(row, { name: e.target.value })}
                    className="min-w-[120px] flex-1 rounded-lg border border-transparent bg-neutral-50 px-2 py-1 text-sm focus:border-neutral-300"
                  />
                  <input
                    type="number"
                    defaultValue={row.count}
                    onBlur={(e) => saveItem(row, { count: Number(e.target.value) || 0 })}
                    className="w-16 shrink-0 rounded-lg border border-transparent bg-neutral-50 px-2 py-1 text-right text-sm tabular-nums focus:border-neutral-300"
                  />
                  <ConfirmDelete onConfirm={() => removeItem(row)} />
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-neutral-400">{TEXT.emptyUser}</p>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addItem();
              }}
              className="mt-3 flex flex-wrap gap-2"
            >
              <input
                ref={newItemActorRef}
                value={newItem.actor}
                onChange={(e) => setNewItem((v) => ({ ...v, actor: e.target.value }))}
                placeholder={TEXT.manage.actorPlaceholder}
                className="w-28 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <input
                ref={newItemNameRef}
                value={newItem.name}
                onChange={(e) => setNewItem((v) => ({ ...v, name: e.target.value }))}
                placeholder={TEXT.manage.namePlaceholder}
                className="min-w-[140px] flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
              >
                {TEXT.manage.addItem}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
