'use client'
import './scss/DmModal.scss'
import {useEffect, useRef} from "react";

import {useModalStore} from "@/app/store/useStore";

const DmModal = () => {
  const modalRef = useRef<HTMLDivElement | null>(null)
  const { isOpen, setOpen } = useModalStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setOpen(false); // Close UtilBox if clicked outside
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setOpen]);
  return (
        <div className={`dmModal-container`} onClick={(e) => e.stopPropagation()} ref={modalRef}>
          <div className={`textBox`}>
            <h1>친구 선택하기</h1>
            <p>친구를 9명 더 추가할 수 있어요.</p>
            <div className={`inputBox`}>
              <input type={'text'} placeholder={'친구의 사용자명 입력하기'}/>
            </div>
          </div>
          <div className={`friendListBox`}>
            {/*친구 리스트*/}
          </div>
          <div className={`btnBox`}>
            <button className={`btn`}>DM 생성</button>
          </div>
        </div>
  );
}

export default DmModal;
