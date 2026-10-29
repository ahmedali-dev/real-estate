"use client";

import { Icon } from "@/components/ui/Icon";

import { useEffect, useRef, useState } from "react";
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
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);
  const [uploading, setUploading] = useState(false);
  const uploadInProgress = useRef(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLElement>) {
    const file = Array.from(event.clipboardData.files).find(item => item.type.startsWith("image/"));
    if (!file) return; // Preserve normal text and URL pasting.
    event.preventDefault();
    void uploadFile(file);
  }

  async function uploadFile(file: File) {
    if (uploadInProgress.current) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setUploadError(t("form.imageTypeError"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError(t("form.imageSizeError"));
      return;
    }
    uploadInProgress.current = true;
    setLocalPreview(URL.createObjectURL(file));
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadImage(file);
      addUploadedImage(result.data.url);
    } catch (err) {
      setUploadError(err instanceof ApiClientError ? err.message : t("form.uploadError"));
    } finally {
      uploadInProgress.current = false;
      setUploading(false);
      setLocalPreview(null);
    }
  }

  return (
    <>
      <section>
        <h3 className="flex flex-wrap items-center gap-2 font-display text-base font-semibold text-ink-800"><Icon name="video" className="h-5 w-5 text-moss-500" />{t("form.videoSection")}</h3>
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

      <section onPaste={handlePaste}>
        <h3 className="flex flex-wrap items-center gap-2 font-display text-base font-semibold text-ink-800"><Icon name="image" className="h-5 w-5 text-moss-500" />{t("form.imagesSection")}</h3>
        <p className="mt-1 text-sm text-ink-400">{t("form.imagesHint")}</p>

        <div
          role="group"
          tabIndex={0}
          aria-label={t("form.pasteImage")}
          aria-busy={uploading}
          className="mt-3 rounded-xl border-2 border-dashed border-ink-200 bg-stone-50 p-5 text-center outline-none focus-visible:border-moss-500 focus-visible:ring-2 focus-visible:ring-moss-200"
        >
          <Icon name="image" className="mx-auto mb-2 h-6 w-6 text-moss-500" />
          <p className="text-sm font-semibold text-ink-700">{t("form.pasteImage")}</p>
          <p className="mt-1 text-xs text-ink-400">{t("form.pasteImageHint")}</p>
        </div>
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
        {localPreview && <div className="mt-3 overflow-hidden rounded-xl border border-ink-100 bg-stone-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img decoding="async" loading="eager" src={localPreview} alt={t("form.imagePreview")} className="max-h-72 w-full object-contain" />
          <p role="status" className="p-3 text-xs text-ink-500">{t("form.uploading")}</p>
        </div>}
        {uploadError && <p role="alert" className="field-error mt-2">{uploadError}</p>}

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
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {form.images.map((url, idx) => (
              <li
                key={`${url}-${idx}`}
                className="overflow-hidden rounded-xl border border-ink-100 bg-stone-50 text-sm text-ink-600"
              >
                <ImagePreview url={url} label={`${t("form.imagePreview")} ${idx + 1}`} errorLabel={t("form.imagePreviewError")} />
                <div className="flex items-center justify-between gap-3 p-3">
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ImagePreview({ url, label, errorLabel }: { url: string; label: string; errorLabel: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="flex h-44 items-center justify-center bg-white">
    {failed ? <p role="status" className="px-4 text-center text-xs text-ink-500">{errorLabel}</p> :
      // eslint-disable-next-line @next/next/no-img-element
      <img loading="lazy" decoding="async" src={url} alt={label} onError={() => setFailed(true)} className="h-full w-full object-contain" />}
  </div>;
}
