"use client";

import CreatUser from "@/components/features/users/creatUser/CreateUser";
import EditUser from "@/components/features/users/editUser/EditUser";
import GetAllUser from "@/components/features/users/getAllUser/getAllUser";
import axios from "axios";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { IoMdPersonAdd } from "react-icons/io";
export default function UsersInfo() {
  const [allUser, serAllUser] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isChangInfo, setIsChangeInfo] = useState(false);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="page-heading">کاربران</h1>
            <h1 className="text-sm text-blue-700">({allUser.length} کاربر )</h1>
          </div>
          <button
            className="flex gap-2 hover:text-blue-600 "
            onClick={creatUser}
          >
            <IoMdPersonAdd size={20} />
            ساخت کاربر
          </button>
        </div>

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

            {allUser.map((user) => (
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
        <div className="modal-panel fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
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
        <div className="modal-panel fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
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
