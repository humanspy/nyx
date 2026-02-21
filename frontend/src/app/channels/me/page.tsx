import AddServer from "@/app/components/AddServer";
import SideBar from "@/app/components/SideBar";
import MainBase from "@/app/components/MainBase";

const me = () => {
  return (
      <div>
        <AddServer/>
        <SideBar/>
        <MainBase/>
      </div>
  )
}

export default me;
