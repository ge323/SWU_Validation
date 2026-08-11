"use client";

import type { ExcelRow } from "../../lib/excel/parser";

export type EvidenceProps = {
  row: ExcelRow;
  status: string;
};

export function EvidenceItem({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="detail-summary-item">
      <span>{label}</span>

      <strong>
        {displayValue(value)}
      </strong>
    </div>
  );
}

export function EvidenceFlowItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flow-item">
      <span className="flow-number">
        {number}
      </span>

      <strong>{title}</strong>

      <p>{description}</p>
    </div>
  );
}

export function EvidenceFlowArrow() {
  return (
    <span
      className="flow-arrow"
      aria-hidden="true"
    >
      →
    </span>
  );
}

export function getRowValue(
  row: ExcelRow,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    const value = row[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return null;
}

function displayValue(
  value: unknown
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "-";
  }

  return String(value);
}