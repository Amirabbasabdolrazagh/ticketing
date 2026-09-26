"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CgCloseR } from "react-icons/cg";

export default function EditProject({
  selectedProjectId,
  setShowEditeModal,
  setIsChangeInfo,
  isChangInfo,
  agents = [],
}) {
  const [projectInfo, setProjectinfo] = useState({});
  const CancelHandler = () => {
    setShowEditeModal(false);
  };

  useEffect(() => {
    async function project() {
      try {
        const res = await axios.get(`/api/projects/${selectedProjectId}`);
        const data = res.data;
        console.log(data);

        if (data.success) {
          setProjectinfo({
            name: data.projectInfo.name,
            description: data.projectInfo.description,
            priority: data.projectInfo.priority,
            status: data.projectInfo.status,
            code: data.projectInfo.code,
            defaultAgent: data.projectInfo.defaultAgent?._id || "",
            subcategories: (data.projectInfo.subcategories || []).join("، "),
            keywords: (data.projectInfo.keywords || []).join("، "),
          });
        }
      } catch (error) {
        console.log(error.response?.data?.message);
      }
    }
    project();
  }, []);

  const inputsHandler = (e) => {
    setProjectinfo({ ...projectInfo, [e.target.name]: e.target.value });
  };

  const changeUserSubmit = async () => {
    try {
      const payload = { defaultAgent: projectInfo.defaultAgent };
      const res = await axios.patch(
        `/api/projects/${selectedProjectId}`,
        payload,
      );
      const data = await res.data;
      if (data.success) {
        toast.success(data.message);
        setShowEditeModal(false);
        setIsChangeInfo(!isChangInfo);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "خطایی رخ داد");
      setShowEditeModal(false);
      setIsChangeInfo(false);
    }
  };
  return (
    <>
      <div className="flex justify-between flex-row-reverse w-full">
        <h1 className="text-xl">مدیریت پشتیبان خدمت</h1>
        <CgCloseR size={25} onClick={CancelHandler} />
      </div>
      <div className="flex flex-col gap-2 " dir="ltr">
        <label>نام خدمت</label>
        <input
          type="text"
          name="name"
          className="border px-4 py-2 rounded  bg-white text-black"
          value={projectInfo.name || ""}
          readOnly
        />
        <label>توضیحات</label>
        <input
          type="text"
          name="description"
          className="border px-4 py-2 rounded  bg-white text-black"
          value={projectInfo.description || ""}
          readOnly
        />
        <label>برچسب تیکت</label>
        <input
          type="text"
          name="code"
          className="border px-4 py-2 rounded  bg-white text-black"
          value={projectInfo.code || ""}
          readOnly
        />
        <label>پشتیبان پیش‌فرض</label>
        <select
          name="defaultAgent"
          className="rounded border bg-white px-4 py-2 text-black"
          value={projectInfo.defaultAgent || ""}
          onChange={inputsHandler}
        >
          <option value="">انتخاب پشتیبان</option>
          {agents.map((agent) => (
            <option key={agent.userId} value={agent.userId}>{agent.name}</option>
          ))}
        </select>
        <label>زیرخدمت‌ها (با ویرگول فارسی جدا کنید)</label>
        <input
          type="text"
          name="subcategories"
          className="rounded border bg-white px-4 py-2 text-black"
          value={projectInfo.subcategories || ""}
          readOnly
        />
        <label>کلیدواژه‌های تشخیص خودکار</label>
        <input
          type="text"
          name="keywords"
          className="rounded border bg-white px-4 py-2 text-black"
          value={projectInfo.keywords || ""}
          readOnly
        />
        <div className="pt-4 flex gap-6" dir="rtl">
          <button
            className="bg-blue-400 hover:bg-blue-500 px-4 py-2 rounded-xl text-white"
            onClick={changeUserSubmit}
          >
            ذخیره
          </button>
          <button
            type="button"
            className="hover:bg-gray-600 px-4 py-2 rounded-xl"
            onClick={CancelHandler}
          >
            انصراف
          </button>
        </div>
      </div>
    </>
  );
}
