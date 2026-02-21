import './scss/DetailBarText.scss'
import { FC } from 'react'

interface DetailBarTextProps {
    text: string;
    selected: boolean;
    bold?: boolean;
    selectColor: string;
    Color?: string;
    onClick: () => void;
}

const DetailBarText: FC<DetailBarTextProps> = ({ text, Color, bold, selected, selectColor, onClick }) => {
    return (
        <div className={`detailText`} style={{ background: selected ? selectColor : '' }} onClick={onClick}>
            <h2 style={{color: selected ? 'white' : Color, fontFamily: bold ? 'Pretendard-Semibold' : ''}}>{text}</h2>
        </div>
    )
}

export default DetailBarText;
