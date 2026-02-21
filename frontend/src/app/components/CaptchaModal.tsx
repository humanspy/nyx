'use client'

import './scss/CaptchaModal.scss'

import { IoClose } from "react-icons/io5";
import Guard from "@/app/components/Svgs/Guard";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import {useCallback, useRef} from "react";
import axios from "axios";
import {useCaptchaStore, useModalStore} from "@/app/store/useStore";

const CaptchaModal = () => {
    const captchaRef = useRef(null);
    const { setVerify} = useCaptchaStore();
    const { isOpen, setOpen } = useModalStore();

    const onVerify = useCallback(async (token: string) => {
        // 토큰을 서버로 보내 검증
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/captcha/verify`, {
            token
        })

        if (res.status === 200 || res.status === 201) {
            setVerify(true);
        }
    }, [setVerify]);

    return (
        <div className={`captchaModal-container`} onClick={(e) => e.stopPropagation()}>
            <div className={`modalClose`} onClick={() => setOpen(!isOpen)} >
                <IoClose color={'#73787c'} size={26} />
            </div>
            <div className={`captchaModal`}>
                <div className={`mainBox`}>
                    <Guard/>
                    <div className={`textBox`}>
                        <h1>잠깐! 로봇 아니고 사람 맞죠?</h1>
                        <h2>로봇이 아니라는 걸 확인시켜주세요.</h2>
                    </div>
                </div>
                <div className={`captcha`}>
                    <HCaptcha sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ''} onVerify={onVerify} ref={captchaRef}/>
                </div>
            </div>
        </div>
    )
}

export default CaptchaModal;
