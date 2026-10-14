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
        <TableRow className="cursor-pointer" onClick={() => route.push(`/admin/projects/${_id}`)}>
          <TableCell className="whitespace-normal py-4">
            <strong className="block text-sm font-black text-slate-900">{name}</strong>
            <span className="mt-1 block line-clamp-2 text-xs leading-6 text-slate-500">{description || "بدون توضیحات"}</span>
          </TableCell>
          <TableCell>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {defaultAgent?.name || "تعیین نشده"}
            </span>
          </TableCell>
          <TableCell className="max-w-64">
            <div className="flex flex-wrap gap-1">
              {subcategories.slice(0, 3).map((item) => (
                <span key={item} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{item}</span>
              ))}
              {subcategories.length > 3 && <span className="text-xs text-slate-400">+{subcategories.length - 3}</span>}
            </div>
          </TableCell>
          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
            <div className="inline-flex items-center justify-center gap-2">
              <span className={priorityStyle(priority) + " rounded-lg px-2.5 py-1 text-xs font-bold"}>
                {faLabel(priorityLabels, priority)}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-9 rounded-xl border border-slate-200 bg-white/70">
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
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </>
  );
}
