import './scss/MainBase.scss'

import DetailBar from "@/app/components/DetailBar";
import {FC} from "react";
import ChatBase from "@/app/components/ChatBase";
import MainBar from "@/app/components/MainBar";

interface MainBaseProps {
  chat?: boolean;
}

const MainBase: FC<MainBaseProps> = ({chat}) => {
    return (
        <div className={`mainBase`}>
            <DetailBar chat={chat} />
          {chat ? <ChatBase /> : <MainBar />}
        </div>
    )
}

export default MainBase;
