import AddServer from "@/app/components/AddServer";
import SideBar from "@/app/components/SideBar";
import BaseBar from "@/app/components/BaseBar";
import MainBase from "@/app/components/MainBase";
// import {useParams} from 'next/navigation'

const Page = () => {

  return (
      <>
        <AddServer />
        <SideBar />
        <MainBase chat={true} />
      </>
  )
}

export default Page;
