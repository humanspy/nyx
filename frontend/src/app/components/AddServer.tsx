import './scss/AddServer.scss'

import Image from "next/image";
import Discord from '../../../public/Images/Discord.png'
import Br from "@/app/components/Br";
import BottomServer from "@/app/components/BottomServer";

const AddServer = () => {
    return (
        <div className={`server-container`}>
            <div className={`homeBox`}>
                <div className="focus" />
                <div className={`home`}>
                    <Image src={Discord} alt={'discord-image'} width={30} height={24}/>
                </div>
            </div>
            <Br/>
            <BottomServer />
        </div>
    )
}

export default AddServer;
