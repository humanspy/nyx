import './scss/Profile.scss'
import {FC} from "react";
import { IoClose } from "react-icons/io5";

interface ProfileProps {
  friendName?: string;
  profileImage?: string;
  selected?: boolean;
}

const Profile: FC<ProfileProps> = ({friendName, profileImage, selected}) => {
  return (
        <div className={`profileContainer ${selected ? 'selected' : ''}`}>
          <div className={`profileBox`}>
            <img src={profileImage} alt={'profile-img'} width={32} height={32}/>
            <h1 className={`friendText`}>{friendName}</h1>
          </div>
          <IoClose size={16} color={'#80848e'} />
        </div>
  )
}

export default Profile;
