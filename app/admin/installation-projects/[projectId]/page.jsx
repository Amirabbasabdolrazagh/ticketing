"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import ProjectWorkflowDashboard from "@/components/features/projects/ProjectWorkflowDashboard";

export default function InstallationProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);

  useEffect(() => {
    axios.get(`/api/installation-projects/${projectId}`)
      .then(({ data }) => setProject(data.project))
      .catch(() => {});
  }, [projectId]);

  if (!project) {
    return <section className="app-page"><div className="glass-panel p-6">در حال دریافت پروژه...</div></section>;
  }

  return <section dir="rtl" className="app-page space-y-5">
    <div className="glass-panel relative overflow-hidden p-6">
      <div className="absolute -left-10 -top-10 size-36 rounded-full bg-blue-400/15 blur-3xl" />
      <div className="relative">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">پروژه نصب و راه‌اندازی</span>
        <h1 className="mt-3 text-2xl font-black">{project.name}</h1>
        <p className="mt-2 text-sm text-slate-500">{project.customerName || "مشتری ثبت نشده"} — {project.location || "محل ثبت نشده"}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{project.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
          <span className="rounded-xl bg-white/80 px-3 py-2">پشتیبان پسیو: {project.passiveAgent?.name || "تعیین نشده"}</span>
          <span className="rounded-xl bg-white/80 px-3 py-2">پشتیبان اکتیو: {project.activeAgent?.name || "تعیین نشده"}</span>
        </div>
      </div>
    </div>
    <ProjectWorkflowDashboard projectId={projectId} project={project} />
  </section>;
}
