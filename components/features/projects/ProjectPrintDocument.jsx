import { PrintLetterhead, PrintSignaturePage } from "./PrintLetterhead";

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

function recordRows(value) {
  if (!value || typeof value !== "object") return [];
  return Array.isArray(value) ? value : Object.values(value);
}

function DataTable({ table }) {
  const rows = recordRows(table.rows).filter((row) => row && typeof row === "object");
  if (!rows.length) return null;

  return (
    <section className="print-contract__section">
      <h2>{table.title}</h2>
      <table className="print-contract__table">
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
      </table>
    </section>
  );
}

/** A print-only, read-only document. It intentionally contains no inputs or screen UI. */
export default function ProjectPrintDocument({ title, code, projectName, details = [], sections = [], tables = [], parties = [] }) {
  return (
    <article dir="rtl" className="print-document print-contract hidden print:block">
      <PrintLetterhead />
      <section className="print-contract__cover">
        <p className="print-contract__eyebrow">سند رسمی پروژه | شرکت ای‌تی رسام</p>
        <h1>{title}</h1>
        <p className="print-contract__project">{projectName || "پروژه نصب و راه‌اندازی"}</p>
        <dl className="print-contract__identity">
          <div><dt>کد سند</dt><dd>{code}</dd></div>
          <div><dt>عنوان پروژه</dt><dd>{projectName || "—"}</dd></div>
        </dl>
      </section>

      {details.length > 0 && (
        <section className="print-contract__section">
          <h2>مشخصات و اطلاعات ثبت‌شده</h2>
          <dl className="print-contract__fields">
            {details.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{printableValue(field.value)}</dd></div>)}
          </dl>
        </section>
      )}

      {sections.map((section) => (
        <section key={section.title} className="print-contract__section">
          <h2>{section.title}</h2>
          {section.note ? <p className="print-contract__note">{section.note}</p> : null}
          <dl className="print-contract__fields">
            {section.fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{printableValue(field.value)}</dd></div>)}
          </dl>
        </section>
      ))}

      {tables.map((table) => <DataTable key={table.title} table={table} />)}

      <PrintSignaturePage documentTitle={title} projectName={projectName} parties={parties} />
    </article>
  );
}
