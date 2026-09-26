"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CgCloseR } from "react-icons/cg";

export default function CreatUser({
  setShowCreateModal,
  showCreateModal,
  setIsChangeInfo,
  isChangInfo,
}) {
  const [userInfo, setUserInfo] = useState({ role: "customer" });
  const [getUser, SetGetUser] = useState({});

  const inputsHandler = (e) => {
    setUserInfo({ ...userInfo, [e.target.name]: e.target.value });
  };
  const CancelHandler = () => {
    setShowCreateModal(!showCreateModal);
  };
  const changeUserSubmit = async () => {
    try {
      const res = await axios.post("/api/users", userInfo);
      const data = await res.data;

      if (data.success) {
        toast.success(data.message);
        setIsChangeInfo(true);
        setShowCreateModal(false);
      } else {
        toast.error(data.message);
        setIsChangeInfo(false);
        setShowCreateModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message||"خطایی رخ داد");
      setIsChangeInfo(false);
      setShowCreateModal(false);
    }
  };
  return (
    <>
      <div className="">
        <div className="flex justify-between flex-row-reverse w-full">
          <h1 className="text-xl">ساخت کاربر</h1>
          <CgCloseR size={25} onClick={CancelHandler} />
        </div>
        <div className="flex flex-col " dir="ltr">
          <label>نام</label>
          <input
            type="text"
            name="name"
            placeholder="نام را وارد کنید"
            className="border px-4 py-2 rounded bg-white text-black placeholder:text-center"
            onChange={inputsHandler}
          />
          <label>شماره تماس</label>
          <input
            type="text"
            name="phone"
            placeholder="شماره موبایل را وارد کنید"
            className="border px-4 py-2 rounded  bg-white text-black placeholder:text-center"
            onChange={inputsHandler}
          />
          <br />
          <label>نقش</label>
          <select
            name="role"
            className=" w-1/3 border rounded "
            onChange={inputsHandler}
            defaultValue="customer"
          >
            <option value="agent">پشتیبان</option>
            <option value="admin">مدیر</option>
            <option value="customer">مشتری</option>
          </select>

          <div className="pt-4 flex gap-6" dir="rtl">
            <button
              className="bg-blue-400 hover:bg-blue-500 px-4 py-2 rounded-xl text-white"
              onClick={changeUserSubmit}
            >
              Save
            </button>
            <button
              type="button"
              className="hover:bg-gray-600 px-4 py-2 rounded-xl"
              onClick={CancelHandler}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
