import Link from "next/link";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { MoreHorizontalIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { faLabel, priorityLabels } from "@/utils/fa-labels";
export default function GetAllProjects({
  name,
  description,
  priority,
  editHandler,
  _id,
  defaultAgent,
  subcategories = [],
  status,
}) {
  const priorityStyle = (priority) => {
    if (priority === "low") {
      return "bg-green-100 text-green-800";
    } else if (priority === "medium") {
      return "bg-yellow-100 text-yellow-800";
    } else if (priority === "high") {
      return "bg-red-100 text-red-800";
    }
    return "bg-gray-100 text-gray-800";
  };
  const route = useRouter();
  return (
    <>
     

      <TableBody>
        <TableRow  onClick={() => route.push(`/admin/projects/${_id}`)}>
          <TableCell>{name}</TableCell>
          <TableCell>{description}</TableCell>
          <TableCell>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {defaultAgent?.name || "تعیین نشده"}
            </span>
          </TableCell>
          <TableCell><span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "archived" ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"}`}>{status === "archived" ? "آرشیو شده" : "در حال اجرا"}</span></TableCell>
          <TableCell className="max-w-64">
            <div className="flex flex-wrap gap-1">
              {subcategories.slice(0, 3).map((item) => (
                <span key={item} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{item}</span>
              ))}
              {subcategories.length > 3 && <span className="text-xs text-slate-400">+{subcategories.length - 3}</span>}
            </div>
          </TableCell>
          <TableCell>
            <span
              className={priorityStyle(priority) + " px-2 py-1 rounded text-sm"}
            >
              {faLabel(priorityLabels, priority)}
            </span>
          </TableCell>
          <TableCell onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-8 ">
                    <MoreHorizontalIcon />
                    <span className="sr-only">باز کردن منو</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => editHandler(_id)}
                  className="flex justify-center hover:bg-green-300"
                >
                  ویرایش
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </>
  );
}
