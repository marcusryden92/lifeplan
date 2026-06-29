import type { AgendaItem, AgendaRow } from "./types";

// Collapses consecutive agenda items that share the same (kind, categoryId)
// pair under a single divider header. Every row in the output has a header —
// runs of size 1 still get one, just without an "N items" suffix when
// rendered. Items without a `kind` (defensive only — buildTodayAgenda sets
// kind on every row) form their own one-off buckets so the header text
// stays stable.
export function groupAgenda(agenda: AgendaItem[]): AgendaRow[] {
  const out: AgendaRow[] = [];

  type Bucket = {
    kind: NonNullable<AgendaItem["kind"]>;
    categoryId: string | null;
    items: AgendaItem[];
  };
  let bucket: Bucket | null = null;

  const keyFor = (
    kind: AgendaItem["kind"],
    categoryId: string | null | undefined,
  ) => `${kind ?? ""}|${categoryId ?? ""}`;

  const flush = () => {
    if (!bucket) return;
    const lead = bucket.items[0];
    out.push({
      header: {
        kind: bucket.kind,
        categoryId: bucket.categoryId,
        categoryName: lead.categoryName,
        categoryColor: lead.categoryColor,
      },
      items: bucket.items,
    });
    bucket = null;
  };

  for (const item of agenda) {
    if (!item.kind) {
      flush();
      bucket = { kind: "task", categoryId: null, items: [item] };
      flush();
      continue;
    }
    const categoryId = item.categoryId ?? null;
    const key = keyFor(item.kind, categoryId);
    const currentKey = bucket ? keyFor(bucket.kind, bucket.categoryId) : null;
    if (bucket && currentKey === key) {
      bucket.items.push(item);
    } else {
      flush();
      bucket = {
        kind: item.kind,
        categoryId,
        items: [item],
      };
    }
  }
  flush();
  return out;
}
