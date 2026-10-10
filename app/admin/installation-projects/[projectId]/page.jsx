"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import ProjectJobBriefAdmin from "@/components/features/projects/ProjectJobBriefAdmin";
import ProjectHandoversAdmin from "@/components/features/projects/ProjectHandoversAdmin";
import ProjectAssessmentsAdmin from "@/components/features/projects/ProjectAssessmentsAdmin";
export default function InstallationProjectDetail() { const { projectId } = useParams(); const [project, setProject] = useState(null); useEffect(() => { axios.get(`/api/installation-projects/${projectId}`).then(({ data }) => setProject(data.project)).catch(() => {}); }, [projectId]); if (!project) return <section className="app-page"><div className="glass-panel p-6">در حال دریافت پروژه...</div></section>; return <section dir="rtl" className="app-page space-y-5"><div className="glass-panel p-6"><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">پروژه نصب و راه‌اندازی</span><h1 className="mt-3 text-2xl font-black">{project.name}</h1><p className="mt-2 text-sm text-slate-500">{project.customerName || "مشتری ثبت نشده"} — {project.location || "محل ثبت نشده"}</p><p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{project.description}</p></div><ProjectAssessmentsAdmin projectId={projectId} /><ProjectJobBriefAdmin projectId={projectId} /><ProjectHandoversAdmin projectId={projectId} /></section>; }
