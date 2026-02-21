import './scss/SearchBar.scss'

const SearchBar = () => {
    return (
        <div className={`searchBar-container`}>
            <div className={`searchBox`}>
                <div className={`search`}><p>대화 찾기 또는 시작하기</p></div>
            </div>
        </div>
    )
}

export default SearchBar;
