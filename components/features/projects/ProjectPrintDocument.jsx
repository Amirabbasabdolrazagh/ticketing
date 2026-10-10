"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { PrintSignaturePage } from "./PrintLetterhead";

const subscribeToClient = () => () => {};

function printableValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "تأیید شده" : "—";
  if (Array.isArray(value)) return value.length ? value.map(printableValue).join("، ") : "—";
  if (typeof value !== "object") return String(value);

  const selected = Object.entries(value)
    .filter(([, item]) => item === true || (typeof item === "string" && item))
    .map(([key, item]) => (item === true ? key : `${key}: ${item}`));
  return selected.length ? selected.join("، ") : "—";
}

const hasPrintableValue = (value) => printableValue(value) !== "—";

function recordRows(value) {
  if (!value || typeof value !== "object") return [];
  return Array.isArray(value) ? value : Object.values(value);
}

function DataTable({ table }) {
  const rows = recordRows(table.rows).filter((row) => row && typeof row === "object" && Object.values(row).some((value) => value !== null && value !== undefined && value !== ""));

  return (
    <section className="print-contract__section">
      <h2>{table.title}</h2>
      {rows.length ? <table className="print-contract__table">
        <thead>
          <tr>
            <th>ردیف</th>
            {table.columns.map((column) => <th key={column.key}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${table.title}-${index}`}>
              <td>{(index + 1).toLocaleString("fa-IR")}</td>
              {table.columns.map((column) => <td key={column.key}>{printableValue(row[column.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table> : <p className="print-contract__note">موردی ثبت نشده است.</p>}
    </section>
  );
}

/** A print-only, read-only document. It intentionally contains no inputs or screen UI. */
export default function ProjectPrintDocument({ title, code, projectName, detailTitle = "مشخصات و اطلاعات ثبت‌شده", details = [], sections = [], tables = [], parties = [], printable = true, compact = false }) {
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);
  if (!mounted || !printable) return null;
  const visibleDetails = compact ? details.filter((field) => hasPrintableValue(field.value)) : details;

  return createPortal(
    <div className="project-print-portal">
      <article dir="rtl" className={`print-document print-contract hidden print:block ${compact ? "print-contract--compact" : ""}`}>
        <section className="print-contract__cover">
          <p className="print-contract__eyebrow">سند رسمی پروژه | شرکت ای‌تی رسام</p>
          <h1>{title}</h1>
          <p className="print-contract__project">{projectName || "پروژه نصب و راه‌اندازی"}</p>
          <dl className="print-contract__identity">
            <div><dt>کد سند</dt><dd>{code}</dd></div>
            <div><dt>عنوان پروژه</dt><dd>{projectName || "—"}</dd></div>
          </dl>
        </section>

      {visibleDetails.length > 0 && (
        <section className="print-contract__section">
          <h2>{detailTitle}</h2>
          <dl className="print-contract__fields">
            {visibleDetails.map((field) => <div key={field.label}><dt>{field.label}</dt><dd dir={field.direction || (field.label.includes("تماس") ? "ltr" : undefined)} className={field.label.includes("تماس") ? "print-contract__phone" : undefined}>{printableValue(field.value)}</dd></div>)}
          </dl>
        </section>
      )}

      {sections.map((section) => section.table ? <DataTable key={section.table.title} table={section.table} /> : (
        <section key={section.title} className="print-contract__section">
          <h2>{section.title}</h2>
          {section.note ? <p className="print-contract__note">{section.note}</p> : null}
          {(compact ? section.fields.filter((field) => hasPrintableValue(field.value)) : section.fields).length ? <dl className="print-contract__fields">
            {(compact ? section.fields.filter((field) => hasPrintableValue(field.value)) : section.fields).map((field) => <div key={field.label}><dt>{field.label}</dt><dd dir={field.direction || (field.label.includes("تماس") ? "ltr" : undefined)} className={field.label.includes("تماس") ? "print-contract__phone" : undefined}>{printableValue(field.value)}</dd></div>)}
          </dl> : <p className="print-contract__note">موردی ثبت نشده است.</p>}
        </section>
      ))}

      {tables.map((table) => <DataTable key={table.title} table={table} />)}

        <PrintSignaturePage documentTitle={title} projectName={projectName} parties={parties} />
      </article>
    </div>,
    document.body,
  );
}
