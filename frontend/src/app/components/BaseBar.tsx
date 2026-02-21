'use client'

import './scss/BaseBar.scss'
import People from "@/app/components/Svgs/People";
import Nitro from "@/app/components/Svgs/Nitro";
import Shop from "@/app/components/Svgs/Shop";
import {AiOutlinePlus} from "react-icons/ai";
import {useEffect, useState} from "react";
import {useModalStore, useSelectDmStore, useSelectStore, useUserDataStore} from "@/app/store/useStore";
import DmModal from "@/app/components/DmModal";
import axios from "axios";
import Cookies from "js-cookie";
import Profile from "@/app/components/Profile";
import Link from "next/link";

const BaseBar = () => {
  const { select, setSelect } = useSelectStore();
  const { isOpen, setOpen } = useModalStore();
  const { selectedDmIndex, setSelectedDmIndex, setFriendName } = useSelectDmStore();
  const [roomList, setRoomList] = useState<{  _id: string, roomName: string }[]>();
  const userData = useUserDataStore(state => state.userData);

  const getRoomList = async () => {
    await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/chat/getRoomList`, {
      headers: {
        Authorization: `Bearer ${Cookies.get('access_token')}`
      }
    }).then((res) => {
      setRoomList(res.data.filter((item: any) => item.roomName.includes('DM')))
    })
  }

  useEffect(() => {
    getRoomList().catch((err) => console.log(err));
  }, [])

    return (
        <div className={`base-container`}>
            <div className={`selectBox`}>
              <Link href={'/channels/me'} style={{textDecorationLine: 'none'}}>
                <div
                    className={`bFlex ${select === 1 ? 'select' : ''}`}
                    onClick={() => setSelect(1)}
                >
                  <People/>
                  <h2>친구</h2>
                </div>
              </Link>
              <div
                  className={`bFlex ${select === 2 ? 'select' : ''}`}
                  onClick={() => setSelect(2)}
              >
                <Nitro/>
                <h2>Nitro</h2>
              </div>
                <div
                    className={`bFlex ${select === 3 ? 'select' : ''}`}
                    onClick={() => setSelect(3)}
                >
                    <Shop/>
                    <h2>상점</h2>
                </div>
            </div>
            <div className={`friendBox`}>
                <div className={`plus-dm`}>
                    <p>다이렉트 메세지</p>
                    <AiOutlinePlus size={16} onClick={() => setOpen(!isOpen)} />
                </div>
            </div>
          {
            roomList?.map((item, idx) => {
              return (
                  // @ts-ignore
                  <Link key={idx} href={`/channels/me/${item._id}`} style={{textDecorationLine: 'none'}}
                        onClick={() => {
                          setSelectedDmIndex(idx);
                          setFriendName(item.roomName.split('_')[2] === userData?.username ? `${item.roomName.split('_')[1]}` : `${item.roomName.split('_')[2]}`);
                        }}>
                    <Profile profileImage={`https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fclipartcraft.com%2Fimages%2Fdiscord-logo-transparent-profile-picture-7.png&f=1&nofb=1&ipt=10bb879158e17470c5bdb61a09545186f45460ee635c3db820300bd1137c5524&ipo=images`} friendName={item.roomName.split('_')[2] === userData?.username ? `${item.roomName.split('_')[1]}` : `${item.roomName.split('_')[2]}`} selected={selectedDmIndex === idx} />
                  </Link>
              )
            })
          }
            {isOpen && <DmModal />}
        </div>
    )
}

export default BaseBar;
