import './scss/DetailBar.scss'
import SelectBar from "@/app/components/SelectBar";
import {FC} from "react";
import ChatBar from "@/app/components/ChatBar";

interface DetailBarProps {
  chat?: boolean;
}

const DetailBar: FC<DetailBarProps> = ({chat}) => {
    return (
        <div className={`detail-container`}>
          {chat ? <ChatBar /> : <SelectBar />}
        </div>
    )
}

export default DetailBar;
