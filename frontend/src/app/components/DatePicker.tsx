import './scss/DatePicker.scss';
import { IoIosArrowDown } from 'react-icons/io';
import {useBirthStore} from "@/app/store/useStore";

const DatePicker = () => {
    const { birth, setYear, setMonth, setDay } = useBirthStore();

    const handleYearChange = (e: any) => {
        const value = e.target.value;
        if (value.length <= 4) { // 최대 4자리
            setYear(value);
        }
    };

    const handleMonthChange = (e: any) => {
        const value = e.target.value;
        if (value.length <= 2 && value <= 12) { // 최대 2자리
            setMonth(value);
        }
    };

    const handleDayChange = (e: any) => {
        const value = e.target.value;
        if (value.length <= 2 && value <= 31) { // 최대 2자리
            setDay(value);
        }
    };

    return (
        <div className="date-picker">
            <label>생년월일<sup className="required">*</sup></label>
            <div className="picker-box">
                <div className="inputBox">
                    <input type="number" placeholder={'년'} value={birth.year === 0 ? '' : birth.year} onChange={handleYearChange} />
                    <IoIosArrowDown size={24} color={'rgba(182, 185, 193, 0.75)'} className={`icon`} />
                </div>
                <div className="inputBox">
                    <input type="number" placeholder={'월'} value={birth.month === 0 ? '' : birth.month}  onChange={handleMonthChange} />
                    <IoIosArrowDown size={24} color={'rgba(182, 185, 193, 0.75)'} className={`icon`} />
                </div>
                <div className="inputBox">
                    <input type="number" placeholder={'일'} value={birth.day === 0 ? '' : birth.day}  onChange={handleDayChange} />
                    <IoIosArrowDown size={24} color={'rgba(182, 185, 193, 0.75)'} className={`icon`} />
                </div>
            </div>
        </div>
    );
};

export default DatePicker;
