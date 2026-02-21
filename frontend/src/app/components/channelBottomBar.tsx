'use client'
import './scss/ChannelBottomBar.scss'
import { FaPlus } from "react-icons/fa6";
import {useSelectDmStore} from "@/app/store/useStore";
import {FC} from "react";

interface ChannelBottomBarProps {
  message?: string;
  setMessage: (message: string) => void;
}

const ChannelBottomBar: FC<ChannelBottomBarProps> = ({message, setMessage}) => {
  const friendName = useSelectDmStore(state => state.friendName);

  return (
      <div className={`cbb-container`}>
        <div className={'search'}>
          <div className={'icon'}>
            <FaPlus color={'#313339'} size={16}/>
          </div>
          <input
              placeholder={`${friendName}에게 메세지 보내기`}
              type={"text"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>
  )
}

export default ChannelBottomBar;
