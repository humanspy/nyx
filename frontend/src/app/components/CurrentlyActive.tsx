import './scss/CurrentlyActive.scss'
import React from "react";

const CurrentlyActive = () => {
    return (
        <aside className={`active-container`}>
            <h1>현재 활동 중</h1>
            <div className={`subBox`}>
                <h2>지금은 조용하네요...</h2>
                <h3>친구가 게임이나 음성 채팅과 같은 활동을 시작하면 여기에 표시돼<br/>
                    요!
                </h3>
            </div>
        </aside>
    )
}

export default CurrentlyActive;
