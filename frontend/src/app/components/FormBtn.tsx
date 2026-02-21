import {FC} from "react";
import './scss/FormBtn.scss'

interface FormBtnProps {
    title: string;
}

const FormBtn: FC<FormBtnProps> = ({ title }) => {
    return (
        <button type={'submit'} className={`formBtn`}>
            <h1>{title}</h1>
        </button>
    )
}

export default FormBtn;
