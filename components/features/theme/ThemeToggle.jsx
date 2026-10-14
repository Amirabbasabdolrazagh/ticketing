"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

function getCurrentTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeToggle({ className = "", showLabel = false }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setTheme(getCurrentTheme()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem("itrasam-theme", nextTheme);
    setTheme(nextTheme);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${showLabel ? "theme-toggle--wide" : ""} ${className}`}
      aria-label={isDark ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تاریک"}
      title={isDark ? "حالت روشن" : "حالت تاریک"}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {isDark ? <Sun /> : <Moon />}
      </span>
      {showLabel && <span>{isDark ? "حالت روشن" : "حالت تاریک"}</span>}
    </button>
  );
}
