import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { faLabel, priorityLabels, statusLabels } from "@/utils/fa-labels";
import { useEffect, useState } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;

function DeadlineCountdown({ deadlineAt, deadline, updatedAt, status }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  if (["resolved", "closed"].includes(status)) {
    return <span className="text-xs font-bold text-emerald-600">انجام‌شده</span>;
  }

  const target = deadlineAt
    ? new Date(deadlineAt).getTime()
    : deadline && updatedAt
      ? new Date(updatedAt).getTime() + Number(deadline) * DAY_MS
      : null;

  if (!target || Number.isNaN(target)) {
    return <span className="text-xs text-slate-400">تعیین نشده</span>;
  }

  if (now === null) {
    return <span className="text-xs text-slate-400">در حال محاسبه...</span>;
  }

  const remaining = target - now;
  if (remaining <= 0) {
    return (
      <span className="rounded-lg bg-red-100 px-2 py-1 text-xs font-black text-red-700">
        مهلت تمام شده
      </span>
    );
  }

  const days = Math.floor(remaining / DAY_MS);
  const hours = Math.floor((remaining % DAY_MS) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

  return (
    <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold tabular-nums ${
      remaining < DAY_MS ? "bg-orange-100 text-orange-700" : "bg-blue-50 text-blue-700"
    }`} dir="rtl">
      {days > 0 ? `${days.toLocaleString("fa-IR")} روز و ` : ""}
      {hours.toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}:
      {minutes.toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}:
      {seconds.toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}
    </span>
  );
}

export default function GetAllTickets({
  _id,
  title,
  status,
  priority,
  basePath,
  assignedTo,
  project,
  creator,
  deadline,
  deadlineAt,
  updatedAt,
}) {
  const router = useRouter();

  const statusStyle = (status) => {
    if (status === "open") {
      return "bg-green-100 text-green-800";
    } else if (status === "in-progress") {
      return "bg-yellow-100 text-yellow-800";
    } else if (status === "resolved") {
      return "bg-blue-100 text-blue-800";
    } else if (status === "closed") {
      return "bg-gray-100 text-gray-800";
    }

    return "bg-gray-100 text-gray-800";
  };

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

  return (
    <TableBody className="even:bg-gray-100 odd:bg-white ">
      <TableRow
        className="cursor-pointer"
        onClick={() => router.push(`${basePath}/tickets/${_id}`)}
      >
        <TableCell>{title}</TableCell>

        {basePath !== "/customer" && (
          <>
            <TableCell>{project?.name || "-"}</TableCell>
            <TableCell>{assignedTo?.name || "تخصیص داده نشده"}</TableCell>
            <TableCell>{creator?.name || "-"}</TableCell>
          </>
        )}

        <TableCell>
          <span className={`${statusStyle(status)} px-2 py-1 rounded text-sm`}>
            {faLabel(statusLabels, status)}
          </span>
        </TableCell>
        {basePath === "/agent" && (
          <TableCell>
            <DeadlineCountdown
              deadlineAt={deadlineAt}
              deadline={deadline}
              updatedAt={updatedAt}
              status={status}
            />
          </TableCell>
        )}
        <TableCell>
          <span
            className={`${priorityStyle(priority)} px-2 py-1 rounded text-sm`}
          >
            {faLabel(priorityLabels, priority)}
          </span>
        </TableCell>
      </TableRow>
    </TableBody>
  );
}
