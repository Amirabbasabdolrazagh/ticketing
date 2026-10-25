import AccountingArchive from "@/components/features/accounting/AccountingArchive";
import getCurrentUser from "@/utils/auth";
import { redirect } from "next/navigation";

export default async function AdminAccountingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (user.role !== "admin") redirect("/auth");
  return <AccountingArchive />;
}
