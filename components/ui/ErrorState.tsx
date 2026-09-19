"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-rust-500/20 bg-rust-50 px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-rust-500 font-display text-xl text-rust-500">
        !
      </div>
      <h3 className="font-display text-lg font-semibold text-ink-800">
        {t("states.errorTitle")}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{message ?? t("states.errorDesc")}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-5">
          {t("states.tryAgain")}
        </button>
      )}
    </div>
  );
}
