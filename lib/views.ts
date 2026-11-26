import "server-only";
import type { ItemRow } from "@/components/ActionItemsTable";
import { formatDateTime, formatDay } from "./format";
import { daysOverdue, isOverdue } from "./metrics";
import type { ActionItem } from "./types";

export const toItemRows = (items: ActionItem[]): ItemRow[] =>
  items.map((it) => ({
    id: it.id,
    caseId: it.caseId,
    action: it.action,
    owner: it.owner,
    dueLabel: it.dueDate ? formatDay(it.dueDate) + (it.dueText ? ` (${it.dueText})` : "") : it.dueText || "No date",
    status: it.status,
    overdueDays: isOverdue(it) ? daysOverdue(it) : null,
    updatedLabel: `${formatDateTime(it.updatedAt)} by ${it.updatedBy}`,
  }));
