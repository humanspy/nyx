import './scss/TextInput.scss';
import {FC} from "react";


interface TextInputProps {
    title: string;
    required?: boolean;
    type?: string;
    state: string | null; // 현재 상태
    setState: (value: string) => void; // 상태를 설정하는 함수
}

const TextInput: FC<TextInputProps> = ({ title, required, type, state, setState }) => {
    return (
        <div className={`inputBox`}>
            <label>{title}{required && <sup className={`required`}>*</sup>}</label>
            <input type={type || 'text'} value={state || ''} onChange={(e) => setState(e.target.value)} required={required} />
        </div>
    )
}

export default TextInput;
