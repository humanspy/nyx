'use client'

import './scss/AddFriendSt.scss'
import WumpusLoneliness from "@/app/components/Svgs/Wumpus/WumpusLoneliness";
import {useState} from "react";
import axios from "axios";
import Cookies from "js-cookie";

const AddFriendSt = () => {
    const [search, setSearch] = useState<string>('');
  const [nick, setNick] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

    const clickHandler = async () => {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/friend/add`, {
          username: search
        }, {
          headers: {
            Authorization: `Bearer ${Cookies.get('access_token')}`
          }
        })
            .then((res) => {
              if (res.status === 201) {
                setError(false)
                setSuccess(true)
                setNick(search)
              }
            })
            .catch((res) => {
              if (res.status === 401) {
                alert('이미 요청 했습니다.')
              } else if (res.status === 404) {
                setSuccess(false)
                setError(true)
              }
            }).finally(() => {
              setTimeout(() => {
                setSuccess(false)
                setError(false)
              }, 2500)
            })
    }

    return (
        <section className={`addFriend-container`}>
            <div className={`addBox`}>
                <div className={`mainTextBox`}>
                    <h1>친구 추가하기</h1>
                </div>
                <div className={`subTextBox`}>
                    <p>Discord 사용자명을 이용하여 친구를 추가할 수 있어요.</p>
                </div>
              <div className={`inputBox ${success ? 'success' : (error ? 'error' : '')}`}>
                    <input
                        type="text"
                        placeholder="Discord 사용자명을 이용하여 친구를 추가할 수 있어요."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button
                        className={!search.trim() ? '' : 'searched'}
                        onClick={clickHandler}
                        disabled={!search.trim()}
                        style={{
                            cursor: !search.trim() ? 'not-allowed' : 'pointer',
                            background: !search.trim() ? 'rgba(88, 101, 242, 0.65)' : '#5865f2'
                        }}>친구 요청 보내기
                    </button>
              </div>
              {success && <p className={`stateText success`}><strong>{nick}</strong>에게 성공적으로 친구 요청을 보냈어요.</p>}
              {error && <p className={`stateText error`}>흠, 안 되는군요. 사용자명을 올바르게 입력했는지 확인하세요.</p>}
            </div>
            <WumpusLoneliness/>
            <p className={`wumpusText`}>Wumpus는 친구를 기다리고 있어요.</p>
        </section>
    )
}

export default AddFriendSt;
