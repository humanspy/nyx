import './scss/AllSt.scss'
import Search from "@/app/components/Search";
import WumpusLoneliness from "@/app/components/Svgs/Wumpus/WumpusLoneliness";

const AllSt = () => {
    return (
        <section className={`allSt-container`} style={{justifyContent: 'center'}}>
            {/*<Search/>*/}
            <WumpusLoneliness />
            <p className={`wumpusText`}>Wumpus는 친구를 기다리고 있어요.</p>
        </section>
    )
}

export default AllSt;
