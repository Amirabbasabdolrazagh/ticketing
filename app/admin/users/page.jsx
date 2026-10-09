"use client";

import CreatUser from "@/components/features/users/creatUser/CreateUser";
import EditUser from "@/components/features/users/editUser/EditUser";
import GetAllUser from "@/components/features/users/getAllUser/getAllUser";
import axios from "axios";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { IoMdPersonAdd } from "react-icons/io";
import { FiSearch, FiUsers } from "react-icons/fi";
export default function UsersInfo() {
  const [allUser, serAllUser] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isChangInfo, setIsChangeInfo] = useState(false);
  const [search, setSearch] = useState("");
  const filteredUsers = allUser.filter((user) => `${user.name} ${user.phone}`.toLowerCase().includes(search.toLowerCase()));
  useEffect(() => {
    async function users() {
      const res = await axios.get("/api/users");
      const data = await res.data;
      if (data.success) {
        serAllUser(data.safeInfo);
      }
    }
    users();
  }, [isChangInfo]);
  const editHandler = (userId) => {
    setSelectedUserId(userId);
    setIsOpen(!isOpen);
  };
  const creatUser = async () => {
    setShowCreateModal(!showCreateModal);
  };
  return (
    <>
      <Toaster />
      <section
        className={
          isOpen
            ? "app-page flex min-h-svh flex-col gap-5 blur-xs"
            : "app-page flex min-h-svh flex-col gap-5"
        }
      >
        <div className="glass-panel flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3"><FiUsers className="size-7 text-blue-600" /><h1 className="page-heading">مدیریت کاربران</h1><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{allUser.length.toLocaleString("fa-IR")} کاربر</span></div>
            <p className="mt-2 text-sm text-slate-500">ساخت و مدیریت ادمین، پشتیبان عمومی، پشتیبان پسیو، پشتیبان اکتیو و مشتری</p>
          </div>
          <button
            className="flex gap-2 hover:text-blue-600 "
            onClick={creatUser}
          >
            <IoMdPersonAdd size={20} />
            افزودن کاربر جدید
          </button>
        </div>

        <div className="glass-panel flex items-center gap-3 p-4"><FiSearch className="text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجوی نام یا شماره تماس..." className="h-11 flex-1 bg-transparent outline-none" /></div>
        {allUser ? (
          <div className="glass-panel w-full overflow-x-auto p-2 sm:p-4">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th>نام</th>
                <th>شماره تماس</th>
                <th>نقش</th>
                <th>عملیات</th>
              </tr>
            </thead>

            {filteredUsers.map((user) => (
              <GetAllUser
                {...user}
                key={user.userId}
                editHandler={editHandler}
              />
            ))}
          </table>
          </div>
        ) : (
          <div className="border-r-9 px-5 rounded-xl border-red-700 text-4xl">
            کاربری یافت نشد
          </div>
        )}
      </section>
      {isOpen ? (
        <div className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/80 bg-white/95 p-5 text-slate-900 shadow-2xl backdrop-blur-2xl sm:p-7">
          <EditUser
            selectedUserId={selectedUserId}
            setIsOpen={setIsOpen}
            setIsChangeInfo={setIsChangeInfo}
            isChangInfo={isChangInfo}
          />
        </div>
      ) : (
        ""
      )}
      {showCreateModal ? (
        <div className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/80 bg-white/95 p-5 text-slate-900 shadow-2xl backdrop-blur-2xl sm:p-7">
          <CreatUser
            showCreateModal={showCreateModal}
            setShowCreateModal={setShowCreateModal}
            setIsChangeInfo={setIsChangeInfo}
            isChangInfo={isChangInfo}
          />
        </div>
      ) : (
        ""
      )}
    </>
  );
}
