'use client'

import './scss/BottomServer.scss'

import { FaPlus } from "react-icons/fa6";
import { FaCompass } from "react-icons/fa6";
import { HiDownload } from "react-icons/hi";
import Br from "@/app/components/Br";
import {useState} from "react";

const BottomServer = () => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div className={`btServer-container`}>
            <div className={`btSr serverAdd`}>
                <FaPlus size={20} color={'#22a65a'} />
            </div>
            <div className={`btFlex`}>
                <div className={`focus ${hoveredIndex === 1 ? 'visible' : ''}`} />
                <div className={`btSr serverFind`}
                     onMouseEnter={() => setHoveredIndex(1)}
                     onMouseLeave={() => setHoveredIndex(null)}>
                    <FaCompass size={22} color={'#22a65a'}/>
                </div>
            </div>
            <Br/>
            <div className={`btFlex mn`}
                 onMouseEnter={() => setHoveredIndex(2)}
                 onMouseLeave={() => setHoveredIndex(null)}
            >
                <div className={`focus ${hoveredIndex === 2 ? 'visible' : ''}`} />
                <div className={`btSr discordDownload`}>
                    <HiDownload size={26} color={'#22a65a'}/>
                </div>
            </div>
        </div>
    )
}

export default BottomServer;
