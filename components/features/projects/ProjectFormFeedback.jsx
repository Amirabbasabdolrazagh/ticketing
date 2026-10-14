"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import "./project-form-feedback.css";

function findField(root, path) {
  const fields = [...(root?.querySelectorAll("[data-field-path]") || [])];
  return fields.find((field) => field.dataset.fieldPath === path)
    || fields.find((field) => field.dataset.fieldPath === path.split(".")[0]);
}

export function useProjectFormFeedback(allErrors) {
  const ref = useRef(null);
  const attach = useCallback((node) => { ref.current = node; }, []);
  const [attempted, setAttempted] = useState(false);
  const id = useId();
  const errors = useMemo(() => attempted ? allErrors : [], [allErrors, attempted]);
  const focusField = useCallback((path) => {
    const field = findField(ref.current, path);
    if (!field) return;
    const control = field.matches("input,select,textarea,button") ? field : field.querySelector("input,select,textarea,button");
    field.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    if (control) control.focus({ preventScroll: true });
    else { field.tabIndex = -1; field.focus({ preventScroll: true }); }
  }, []);
  const report = useCallback((nextErrors) => {
    setAttempted(true);
    if (nextErrors.length) window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusField(nextErrors[0].path)));
    return nextErrors.length === 0;
  }, [focusField]);

  useEffect(() => {
    const cleanups = [];
    errors.forEach((error, index) => {
      const field = findField(ref.current, error.path);
      if (!field) return;
      field.classList.add("project-field-invalid");
      const controls = field.matches("input,select,textarea") ? [field] : [...field.querySelectorAll("input,select,textarea")];
      const message = document.createElement("span");
      message.id = `${id}-error-${index}`;
      message.className = "project-field-error";
      message.textContent = error.message;
      if (field.matches("input,select,textarea")) field.insertAdjacentElement("afterend", message);
      else field.append(message);
      controls.forEach((control) => {
        const invalid = control.getAttribute("aria-invalid");
        const described = control.getAttribute("aria-describedby");
        control.setAttribute("aria-invalid", "true");
        control.setAttribute("aria-describedby", [described, message.id].filter(Boolean).join(" "));
        cleanups.push(() => {
          if (invalid === null) control.removeAttribute("aria-invalid"); else control.setAttribute("aria-invalid", invalid);
          if (described === null) control.removeAttribute("aria-describedby"); else control.setAttribute("aria-describedby", described);
        });
      });
      cleanups.push(() => { field.classList.remove("project-field-invalid"); message.remove(); });
    });
    return () => cleanups.reverse().forEach((cleanup) => cleanup());
  }, [errors, id]);

  return { attach, errors, report, focusField };
}

export function ProjectFormErrorSummary({ feedback }) {
  if (!feedback.errors.length) return null;
  return <aside role="alert" className="project-error-summary print:hidden" dir="rtl">
    <strong>{feedback.errors.length.toLocaleString("fa-IR")} مورد الزامی نیاز به تکمیل دارد.</strong>
    <p>فیلدهای قرمز را تکمیل کنید. برای رفتن به هر مورد، روی آن بزنید.</p>
    <ul>{feedback.errors.map((error) => <li key={error.path}><button type="button" onClick={() => feedback.focusField(error.path)}>{error.message}</button></li>)}</ul>
  </aside>;
}
