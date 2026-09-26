"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CgCloseR } from "react-icons/cg";

export default function EditUser({
  selectedUserId,
  setIsOpen,
  setIsChangeInfo,
  isChangInfo,
}) {
  const [userInfo, setUserInfo] = useState({});
  
  useEffect(() => {
    if (!selectedUserId) return;
    async function user() {
      try {
        const res = await axios.get(`/api/users/${selectedUserId}`);

        const data = res.data;

        if (data.success) {
          setUserInfo({
            name: data.safeInfo.name,

            phone: data.safeInfo.phone,

            role: data.safeInfo.role,
          });
        }
      } catch (error) {
        console.log(error);
      }
    }
    user();
  }, [selectedUserId]);

  const inputsHandler = (e) => {
    setUserInfo({ ...userInfo, [e.target.name]: e.target.value });
  };
  const CancelHandler = () => {
    setIsOpen(false);
  };
  const changeUserSubmit = async () => {
    try {
      const res = await axios.patch(`/api/users/${selectedUserId}`, userInfo);
      const data = await res.data;
      if (data.success) {
        toast.success(data.message);
        setIsOpen(false);
        setIsChangeInfo(!isChangInfo);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "خطایی رخ داد");
      setIsOpen(false);
      setIsChangeInfo(false);
    }
  };

  return (
    <>
      <div className="">
        <div className="flex justify-between flex-row-reverse w-full">
          <h1 className="text-xl">ویرایش کاربر</h1>
          <CgCloseR size={25} onClick={CancelHandler} />
        </div>
        <div className="flex flex-col " dir="ltr">
          <label>نام</label>
          <input
            type="text"
            name="name"
            value={userInfo.name || ""}
            className="border px-4 py-2 rounded bg-white text-black"
            onChange={inputsHandler}
          />
          <label>شماره تماس</label>
          <input
            type="text"
            name="phone"
            value={userInfo.phone || ""}
            className="border px-4 py-2 rounded  bg-white text-black"
            onChange={inputsHandler}
          />
          <br />
          <label>نقش</label>
          <select
            name="role"
            className=" w-1/3 border rounded "
            onChange={inputsHandler}
            value={userInfo.role || ""}
            
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
