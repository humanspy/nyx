import './scss/Search.scss'
import { IoSearchOutline } from "react-icons/io5";

const Search = () => {
  return (
      <div className={`search-container`}>
        <div className={`searchBox`}>
          <input placeholder={'검색하기'} className={`search`}/>
          <IoSearchOutline size={22} color={'#adb0b8'} />
        </div>
      </div>
  )
}

export default Search;
