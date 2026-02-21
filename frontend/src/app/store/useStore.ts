import {create} from "zustand";

interface Birth {
    year: number
    month: number
    day: number
}

interface BirthStore {
    birth: Birth
    setYear: (year: number) => void
    setMonth: (month: number) => void
    setDay: (day: number) => void
}

interface CaptchaStore {
    verify: boolean
    setVerify: (verify: boolean) => void
}

interface ModalStore {
    isOpen: boolean
    setOpen: (isOpen: boolean) => void
}

interface SelectStore {
    select: number | null;
    setSelect: (value: number | null) => void;
}

interface SelectedIndexStore {
    selectedIndex: number | null;
    setSelectedIndex: (value: number | null) => void;
}

interface SelectDmStore {
    selectedDmIndex: number | null;
    friendName: string | null;
    setSelectedDmIndex: (index: number) => void;
    setFriendName: (name: string | null) => void;
}

interface User {
    id: string; // 유저 고유 ID
    email: string; // 이메일 주소
    nickname: string; // 닉네임
    username: string; // 유저 이름
    password: string; // 암호화된 비밀번호
    description: string | null; // 유저 설명 (nullable)
    avatar_url: string | null; // 프로필 이미지 URL (nullable)
    pronoun: string | null; // 대명사 (nullable)
    phone: string | null; // 전화번호 (nullable)
    birth: string; // 생년월일 (ISO8601 형식)
    role: string; // 유저 권한 (e.g., "User")
    promo: boolean; // 프로모션 여부
    status: string; // 현재 상태 (e.g., "Online")
    join_date: string; // 가입 날짜 (ISO8601 형식)
    update_date: string; // 마지막 업데이트 날짜 (ISO8601 형식)
}


interface UserDataStore {
    userData: User;
    setUserData: (data: User) => void;
}

export const useBirthStore = create<BirthStore>((set) => ({
    birth: { year: 0, month: 0, day: 0 },
    setYear: (year: number) => set((state) => ({ birth: { ...state.birth, year } })),
    setMonth: (month: number) => set((state) => ({ birth: { ...state.birth, month } })),
    setDay: (day: number) => set((state) => ({ birth: { ...state.birth, day } })),
}));

export const useCaptchaStore = create<CaptchaStore>((set) => ({
    verify: false,
    setVerify: (verify: boolean) => set({ verify }),
}));

export const useModalStore = create<ModalStore>((set) => ({
    isOpen: false,
    setOpen: (isOpen: boolean) => set({ isOpen }),
}));

export const useSelectStore = create<SelectStore>((set) => ({
    select: 1,
    setSelect: (value) => set({ select: value }),
}));

export const useSelectedIndexStore = create<SelectedIndexStore>((set) => ({
    selectedIndex: 4,
    setSelectedIndex: (value) => set({ selectedIndex: value }),
}));

export const useSelectDmStore = create<SelectDmStore>((set) => ({
    selectedDmIndex: -1,
    friendName: '',
    setSelectedDmIndex: (index) => set({ selectedDmIndex: index }),
    setFriendName: (name) => set({ friendName: name }),
}));

export const useUserDataStore = create<UserDataStore>((set) => ({
    userData: {
        id: '',
        email: '',
        nickname: '',
        username: '',
        password: '',
        description: null,
        avatar_url: null,
        pronoun: null,
        phone: null,
        birth: '',
        role: '',
        promo: false,
        status: '',
        join_date: '',
        update_date: ''
    },
    setUserData: (data) => set({userData: data})
}));
