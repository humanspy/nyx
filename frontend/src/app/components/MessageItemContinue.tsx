import './scss/MessageItemContinue.scss'
import {Message} from "@/app/components/ChatBase";
import {FC} from "react";
import {formatTime} from "@/app/components/formatTime";

interface MessageItemProps {
  msg: Message,
  isLasted?: boolean;
}

const MessageItemContinue: FC<MessageItemProps> = ({ msg, isLasted }) => {
  return (
      <div className={`messageBoxContinue ${isLasted ? 'is-last' : ''}`}>
        <div>
          <p className="messageTimestamp">{formatTime(new Date(msg.createdAt))}</p>
          <h2 className="messageContent">{msg.content}</h2>
        </div>
      </div>
  )
}

export default MessageItemContinue;
