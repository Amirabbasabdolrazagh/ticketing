"use client";

import { useParams } from "next/navigation";
import AdminProjectFormsHub from "@/components/features/projects/AdminProjectFormsHub";

export default function ProjectFormsPage() {
  const { projectId, formType } = useParams();
  return <AdminProjectFormsHub projectId={projectId} formType={formType} />;
}
