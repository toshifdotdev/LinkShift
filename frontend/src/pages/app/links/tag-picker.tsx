import { useState } from "react";
import { X } from "lucide-react";
import { useTags } from "@/hooks/use-tags";
import { MAX_TAG_NAME_LENGTH, normaliseTagName } from "@/lib/tag-constants";
import { Input } from "@/components/ui/input";
import type { Tag } from "@/api/tags";

/**
 * Free-text tag picker.
 *
 * Typing a new name creates it, because a picker that can only select existing
 * tags forces a separate create step for every campaign. Existing tags are
 * offered as hints, and the owner's current selection is always visible as
 * removable chips so it is obvious what will be saved.
 *
 * Names are normalised on the way in, matching the backend, so "Launch" typed
 * here attaches the same tag the list filter shows as "launch".
 */
export function TagPicker({
  value,
  onChange,
  id,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
}) {
  const [draft, setDraft] = useState("");
  const tagsQuery = useTags();
  const existing: Tag[] = tagsQuery.data ?? [];

  const selected = new Set(value.map(normaliseTagName));

  const add = (raw: string) => {
    const name = normaliseTagName(raw);
    if (!name || name.length > MAX_TAG_NAME_LENGTH) {
      setDraft("");
      return;
    }
    if (selected.has(name)) {
      setDraft("");
      return;
    }
    onChange([...value, name]);
    setDraft("");
  };

  const remove = (name: string) => {
    onChange(value.filter((v) => normaliseTagName(v) !== normaliseTagName(name)));
  };

  const suggestions = existing
    .filter((t) => !selected.has(t.name))
    .filter((t) => (draft ? t.name.includes(normaliseTagName(draft)) : true))
    .slice(0, 6);

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {value.map((name) => (
            <li key={name}>
              <span className="inline-flex items-center gap-1 rounded border border-border bg-elevated px-2 py-0.5 font-mono text-[11px] text-fg-secondary">
                {name}
                <button
                  type="button"
                  onClick={() => remove(name)}
                  aria-label={`Remove tag ${name}`}
                  className="text-fg-muted transition-colors hover:text-fg"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          // Enter commits rather than submitting the whole form, which is the
          // expected behaviour for a tag field and avoids a surprise create.
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          }
          if (e.key === "Backspace" && !draft && value.length > 0) {
            remove(value[value.length - 1]);
          }
        }}
        onBlur={() => add(draft)}
        placeholder={value.length === 0 ? "Type a tag, press Enter" : "Add another"}
        maxLength={MAX_TAG_NAME_LENGTH}
      />

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => add(t.name)}
              className="rounded border border-border px-2 py-0.5 font-mono text-[11px] text-fg-muted transition-colors hover:border-brand/40 hover:text-fg-secondary"
            >
              + {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}