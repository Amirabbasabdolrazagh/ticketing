import { faLabel, roleLabels } from "@/utils/fa-labels";

export default function GetAllUser({name , phone , role , editHandler ,userId}) {



  return (
    <> 
      <tbody className="even:bg-gray-100 odd:bg-white" >
        <tr>
          <td className=" border px-4 text-center py-2">{name}</td>
          <td className=" border px-4 text-center py-2">{phone}</td>
          <td className=" border px-4 text-center py-2">{faLabel(roleLabels, role)}</td>
       
          <td className=" border px-4 text-center py-2">
            <button type="button"  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" onClick={()=>editHandler(userId)}>
              ویرایش
            </button>
          </td>
        </tr>
      </tbody>
    </>
  );
}
