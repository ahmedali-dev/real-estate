"use client";

import { useRef, useState } from "react";
import type { ListingFormState } from "@/lib/forms/useListingFormState";
import { ApiClientError, uploadImage } from "@/lib/api-client";

export function ImagesAndVideoFields({
  form,
  update,
  imageUrl,
  setImageUrl,
  addImage,
  removeImage,
  addUploadedImage,
  handleFetchCover,
  coverStatus,
  setCoverStatus,
  coverMessage,
  setCoverMessage,
  errors,
  t,
}: {
  form: ListingFormState;
  update: <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) => void;
  imageUrl: string;
  setImageUrl: (value: string) => void;
  addImage: () => void;
  removeImage: (idx: number) => void;
  addUploadedImage: (url: string) => void;
  handleFetchCover: () => void;
  coverStatus: "idle" | "loading" | "success" | "error";
  setCoverStatus: (status: "idle" | "loading" | "success" | "error") => void;
  coverMessage: string | null;
  setCoverMessage: (message: string | null) => void;
  errors: Record<string, string>;
  t: (key: string) => string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow selecting the same file again later
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadImage(file);
      addUploadedImage(result.data.url);
    } catch (err) {
      setUploadError(err instanceof ApiClientError ? err.message : t("form.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <section>
        <h3 className="font-display text-base font-semibold text-ink-800">{t("form.videoSection")}</h3>
        <p className="mt-1 text-sm text-ink-400">{t("form.videoHint")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="input-field"
            placeholder={t("form.videoUrlPlaceholder")}
            value={form.tiktokUrl}
            onChange={(e) => {
              update("tiktokUrl", e.target.value);
              setCoverStatus("idle");
              setCoverMessage(null);
            }}
          />
          <button
            type="button"
            onClick={handleFetchCover}
            disabled={!form.tiktokUrl.trim() || coverStatus === "loading"}
            className="btn-secondary whitespace-nowrap"
          >
            {coverStatus === "loading" ? t("form.fetchingCover") : t("form.fetchCover")}
          </button>
        </div>
        {errors.tiktokUrl && <p className="field-error">{errors.tiktokUrl}</p>}
        {coverMessage && (
          <p
            className={`mt-2 text-xs font-medium ${
              coverStatus === "error" ? "text-rust-500" : "text-moss-600"
            }`}
          >
            {coverMessage}
          </p>
        )}
      </section>

      <section>
        <h3 className="font-display text-base font-semibold text-ink-800">{t("form.imagesSection")}</h3>
        <p className="mt-1 text-sm text-ink-400">{t("form.imagesHint")}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary whitespace-nowrap"
          >
            {uploading ? t("form.uploading") : t("form.uploadFromDevice")}
          </button>
          <span className="text-xs text-ink-400">{t("form.orPasteUrl")}</span>
        </div>
        {uploadError && <p className="field-error mt-2">{uploadError}</p>}

        <div className="mt-3 flex gap-2">
          <input
            className="input-field"
            placeholder={t("form.imageUrlPlaceholder")}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addImage();
              }
            }}
          />
          <button type="button" onClick={addImage} className="btn-secondary whitespace-nowrap">
            {t("form.addImage")}
          </button>
        </div>
        {form.images.length > 0 && (
          <ul className="mt-3 space-y-2">
            {form.images.map((url, idx) => (
              <li
                key={`${url}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-md border border-ink-100 bg-stone-50 px-3 py-2 text-sm text-ink-600"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {idx === 0 && (
                    <span className="flex-shrink-0 rounded-full bg-brass-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brass-600">
                      {t("form.coverLabel")}
                    </span>
                  )}
                  <span className="truncate">{url}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="flex-shrink-0 text-xs font-semibold text-rust-500 hover:underline"
                >
                  {t("form.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
