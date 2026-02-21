import './scss/MessageItem.scss'
import {FC} from "react";
import {Message} from "@/app/components/ChatBase";
import {formatTime} from "@/app/components/formatTime";

interface MessageItemProps {
  msg: Message,
  imageUrl: string | undefined,
}

const MessageItem: FC<MessageItemProps> = ({msg, imageUrl}) => {
  return (
      <div className="messageBox">
        <img
            src={imageUrl}
            alt="profile"
            className="profileImage"
            width={36}
            height={36}
        />
        <div>
          <div className="messageDetail">
            <h1 className="messageUsername">{msg.senderId}</h1>
            <p className="messageTimestamp">{formatTime(new Date(msg.createdAt))}</p>
          </div>
          <h2 className="messageContent">{msg.content}</h2>
        </div>
      </div>
  );
}
export default MessageItem;
