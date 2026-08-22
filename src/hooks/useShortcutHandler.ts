import { useEffect, useState } from "react";

export type ExpenseModalMode = "manual" | "scan";

export interface SharedInput {
  file?: File;
  text?: string;
}

/**
 * Owns the ExpenseModal's open/mode state and the PWA deep-link handling
 * that drives it: app-shortcut ?action=add/scan, and an OS share-sheet
 * share (?action=share), which also picks up the shared file/text the
 * service worker stashed in Cache Storage before redirecting here.
 */
export function useShortcutHandler() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ExpenseModalMode>("manual");
  const [sharedInput, setSharedInput] = useState<SharedInput | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (action !== "add" && action !== "scan" && action !== "share") return;

    setModalMode(action === "add" ? "manual" : "scan");
    setModalOpen(true);

    if (action === "share") {
      caches
        .open("runway-os-share-v1")
        .then(async (cache) => {
          const [fileRes, textRes] = await Promise.all([
            cache.match("/__shared-file"),
            cache.match("/__shared-text"),
          ]);
          const file = fileRes
            ? new File([await fileRes.blob()], "shared-image", {
                type: fileRes.headers.get("Content-Type") || "image/jpeg",
              })
            : undefined;
          const text = textRes ? await textRes.text() : undefined;
          if (file || text) setSharedInput({ file, text });
          await Promise.all([cache.delete("/__shared-file"), cache.delete("/__shared-text")]);
        })
        .catch(() => {
          // Cache Storage unavailable (e.g. no service worker in dev) — the
          // share still opens the scan mode, just without prefilled input.
        });
    }

    params.delete("action");
    const search = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (search ? `?${search}` : ""));
  }, []);

  const openManual = () => {
    setModalMode("manual");
    setModalOpen(true);
  };

  const close = () => {
    setModalOpen(false);
    setSharedInput(null);
  };

  return { modalOpen, modalMode, sharedInput, openManual, close };
}
