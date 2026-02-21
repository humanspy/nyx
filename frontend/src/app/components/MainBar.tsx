'use client'

import './scss/MainBar.scss'
import AddFriendSt from "@/app/components/Selects/AddFriendSt";
import CurrentlyActive from "@/app/components/CurrentlyActive";
import {useSelectDmStore, useSelectedIndexStore, useUserDataStore} from "@/app/store/useStore";
import OnlineSt from "@/app/components/Selects/OnlineSt";
import AllSt from "@/app/components/Selects/AllSt";
import WaitSt from "@/app/components/Selects/WaitSt";
import BlackListSt from "@/app/components/Selects/BlackListSt";
import {useEffect} from "react";
import axios from "axios";
import Cookies from "js-cookie";

const MainBar = () => {
  const selectedIndex = useSelectedIndexStore(state => state.selectedIndex);
  const {setSelectedDmIndex, setFriendName} = useSelectDmStore();
  const { setUserData } = useUserDataStore();

  const getUser = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/getUser`, {
        headers: {
          Authorization: `Bearer ${Cookies.get('access_token')}`
        }
      });

      if (response.status === 200) {
        setUserData(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  useEffect(() => {
    setSelectedDmIndex(-1)
    setFriendName('')
    getUser();
  }, []);

  return (
        <div className={`main-container`}>
          {selectedIndex === 0 ? <OnlineSt /> : null}
          {selectedIndex === 1 ? <AllSt /> : null}
          {selectedIndex === 2 ? <WaitSt /> : null}
          {selectedIndex === 3 ?  <BlackListSt /> : null}
          {selectedIndex === 4 ?  <AddFriendSt/> : null}
            <CurrentlyActive />
        </div>
    )
}

export default MainBar;
