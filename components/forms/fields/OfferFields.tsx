"use client";
import { SelectDropdown } from "@/components/ui/SelectDropdown";

import { useEffect, useState } from "react";
import type { ListingFormState } from "@/lib/forms/useListingFormState";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type UserOption = { userId: string; name: string };
const types = ["villa", "apartment", "duplex", "floor", "shop", "other"] as const;

export function OfferFields({ form, update, errors, existingUser, showPropertyType = true }: {
  form: ListingFormState;
  update: <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) => void;
  errors: Record<string, string>;
  existingUser?: UserOption;
  showPropertyType?: boolean;
}) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    fetch("/api/users/options", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Failed to load users");
        const result = await response.json();
        setUsers(result.data);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  const options = existingUser && !users.some(user => user.userId === existingUser.userId) ? [existingUser, ...users] : users;
  return <>
    {showPropertyType && <div>
      <label className="label-field" htmlFor="propertyType">{t("offer.propertyType")}</label>
      <SelectDropdown id="propertyType" className="input-field" value={form.propertyType} onChange={event => update("propertyType", event.target.value as ListingFormState["propertyType"])}>
        {types.map(type => <option key={type} value={type}>{t(`offer.types.${type}`)}</option>)}
      </SelectDropdown>
      {errors.propertyType && <p className="field-error">{errors.propertyType}</p>}
    </div>}
    <div>
      <label className="label-field" htmlFor="broughtByUserId">{t("offer.broughtBy")}</label>
      <SelectDropdown id="broughtByUserId" className="input-field" value={form.broughtByUserId} disabled={loading || failed} onChange={event => update("broughtByUserId", event.target.value)}>
        <option value="">{t("offer.selectUser")}</option>
        {options.map(user => <option key={user.userId} value={user.userId}>{user.name}</option>)}
      </SelectDropdown>
      {failed && <p className="field-error">{t("offer.usersError")} <button type="button" className="underline" onClick={() => setAttempt(value => value + 1)}>{t("offer.retry")}</button></p>}
      {errors.broughtByUserId && <p className="field-error">{errors.broughtByUserId}</p>}
    </div>
  </>;
}
