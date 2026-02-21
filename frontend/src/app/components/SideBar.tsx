import './scss/SideBar.scss'
import SearchBar from "@/app/components/SearchBar";
import BaseBar from "@/app/components/BaseBar";

const SideBar = () => {
    return (
        <div className={`side-container`}>
            <SearchBar />
            <BaseBar />
        </div>
    )
}

export default SideBar;
