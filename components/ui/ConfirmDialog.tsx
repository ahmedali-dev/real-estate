"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isDanger = true,
  isLoading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="font-display text-lg font-semibold text-ink-800">{title}</h3>
        <p className="mt-2 text-sm text-ink-500">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button
            className={isDanger ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? t("states.deleting") : confirmLabel ?? t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
