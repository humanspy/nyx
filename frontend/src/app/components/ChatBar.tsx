'use client'
import './scss/ChatBar.scss'
import People from "@/app/components/Svgs/People";
import {useSelectDmStore} from "@/app/store/useStore";

const ChatBar = () => {
  const friendName = useSelectDmStore(state => state.friendName);

  return (
      <div className={`chatBar`}>
        <div className={`subBox`}>
          <img src={`https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fclipartcraft.com%2Fimages%2Fdiscord-logo-transparent-profile-picture-7.png&f=1&nofb=1&ipt=10bb879158e17470c5bdb61a09545186f45460ee635c3db820300bd1137c5524&ipo=images`} alt={'profile-img'} width={32} height={32}/>
          <h2>{friendName}</h2>
        </div>
        {/*<div className="divider"/>*/}
        {/*<div className={`mainBox`}>*/}
        {/*  <DetailBarText text={'온라인'} selected={selectedIndex === 0} selectColor={'#42444a'}*/}
        {/*                 onClick={() => setSelectedIndex(0)}/>*/}
        {/*  <DetailBarText text={'모두'} selected={selectedIndex === 1} selectColor={'#42444a'}*/}
        {/*                 onClick={() => setSelectedIndex(1)}/>*/}
        {/*  <DetailBarText text={'대기 중'} selected={selectedIndex === 2} selectColor={'#42444a'}*/}
        {/*                 onClick={() => setSelectedIndex(2)}/>*/}
        {/*  <DetailBarText text={'차단 목록'} selected={selectedIndex === 3} selectColor={'#42444a'}*/}
        {/*                 onClick={() => setSelectedIndex(3)}/>*/}
        {/*  <DetailBarText text={'친구 추가하기'} Color={'#22a65a'} bold={true} selected={!(selectedIndex === 4)}*/}
        {/*                 selectColor={'#248046'} onClick={() => setSelectedIndex(4)}/>*/}
        {/*</div>*/}
      </div>
  )
}

export default ChatBar;
