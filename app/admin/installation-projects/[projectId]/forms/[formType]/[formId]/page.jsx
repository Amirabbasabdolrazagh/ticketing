"use client";

import { useParams } from "next/navigation";
import AdminProjectFormDetail from "@/components/features/projects/AdminProjectFormDetail";

export default function ProjectFormDetailPage() {
  const { projectId, formType, formId } = useParams();
  return <AdminProjectFormDetail projectId={projectId} formType={formType} formId={formId} />;
}
