'use client'

import './register.scss';
import Link from "next/link";
import TextInput from "@/app/components/TextInput";
import {useState} from "react";
import DatePicker from "@/app/components/DatePicker";
import FormBtn from "@/app/components/FormBtn";
import {useGSAP} from "@gsap/react";
import {gsap} from "gsap";
import {useBirthStore} from "@/app/store/useStore";
import axios from "axios";

const register = () => {
    const [email, setEmail] = useState<string | null>(null);
    const [nickname, setNickname] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [password, setPassword] = useState<string | null>(null);
    const [promo, setPromo] = useState(false);

    const birth = useBirthStore(state => state.birth);
    const birthday = new Date(birth.year, birth.month - 1, birth.day).toISOString();

    const data = [
        {
            title: '이메일',
            state: email,
            setState: setEmail,
            required: true,
            type: 'email'
        },
        {
            title: '별명',
            state: nickname,
            setState: setNickname,
            required: false,
            type: 'text'
        },
        {
            title: '사용자명',
            state: username,
            setState: setUsername,
            required: true,
            type: 'text'
        },
        {
            title: '비밀번호',
            state: password,
            setState: setPassword,
            required: true,
            type: 'password'
        },
    ]

    const passwordRegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    const fetchData = async () => {
        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
                email,
                username,
                password,
                tosAccepted: true,
            });

            if (res.status === 201) {
                window.location.href = '/login';
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || '회원가입에 실패했습니다.';
            alert(msg);
        }
    }

    useGSAP(() => {
        gsap.fromTo('.register-container', {
            opacity: 0,
            y: -100,
        }, {
            y: 0,
            opacity: 1,
            duration: 0.3,
            ease: 'power3.inOut'
        })
    })

    const submitHandler = (e: any) => {
        e.preventDefault();
        if (!passwordRegExp.test(password as string)) {
            alert('비밀번호는 최소 8자 이상, 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.');
        } else {
            fetchData().catch(err => console.log(err));
        }
    }

    return (
        <div className={`register`} onContextMenu={(e) => e.preventDefault()}>
            <div className={`logo`}>
                <img src="/Images/Logo.png" alt="Logo" width={124} height={24}/>
            </div>
            <div className={`register-container`}>
                <h1 className={`mainText`}>계정 만들기</h1>
                <form className={`register-form`} onSubmit={submitHandler}>
                    {data.map((item: any, idx: number) => {
                        return (
                            <div key={idx}>
                                <TextInput title={item.title} state={item.state} setState={item.setState} required={item.required} type={item.type}/>
                                <div style={{marginBottom: '2rem'}} />
                            </div>
                        )
                    })}
                    <DatePicker/>
                    <div className={`promo`}>
                        <input type={"checkbox"} checked={promo} onChange={() => setPromo(!promo)} />
                        <p>(선택사항) Discord 소식, 도움말, 특별 할일을 이메일로 보내주세요. 언제든지 취<br/>
                            소하실 수 있어요.
                        </p>
                    </div>
                    <FormBtn title={'계속하기'} />
                    <p className={`term`}>등록하는 순간 Discord <span>서비스 이용 약관</span>와 <span>개인정보 보호 정책</span>에 동의하게 됩니다.</p>
                </form>
                <p className={`p-login`}><Link href={"/login"} style={{ textDecoration: "none", color: '#01a8fb'}}>이미 계정이 있으신가요?</Link></p>
            </div>
        </div>
    )
}

export default register;
