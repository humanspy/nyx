'use client'

import './scss/SelectBar.scss'

import DetailBarText from "@/app/components/DetailBarText";
import People from "@/app/components/Svgs/People";
import {useState} from "react";
import {useSelectedIndexStore} from "@/app/store/useStore";

const SelectBar = () => {
    const { selectedIndex, setSelectedIndex } = useSelectedIndexStore();

    return (
        <div className={`selectBar`}>
            <div className={`subBox`}>
                <People />
                <h2>친구</h2>
            </div>
            <div className="divider" />
            <div className={`mainBox`}>
                <DetailBarText text={'온라인'} selected={selectedIndex === 0} selectColor={'#42444a'} onClick={() => setSelectedIndex(0)} />
                <DetailBarText text={'모두'} selected={selectedIndex === 1} selectColor={'#42444a'} onClick={() => setSelectedIndex(1)} />
                <DetailBarText text={'대기 중'} selected={selectedIndex === 2} selectColor={'#42444a'} onClick={() => setSelectedIndex(2)} />
                <DetailBarText text={'차단 목록'} selected={selectedIndex === 3} selectColor={'#42444a'} onClick={() => setSelectedIndex(3)} />
                <DetailBarText text={'친구 추가하기'} Color={'#22a65a'} bold={true} selected={!(selectedIndex === 4)} selectColor={'#248046'} onClick={() => setSelectedIndex(4)} />
            </div>
        </div>
    )
}

export default SelectBar;
