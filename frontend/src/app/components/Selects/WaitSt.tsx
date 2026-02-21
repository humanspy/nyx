import './scss/WaitSt.scss'
import Search from "@/app/components/Search";
import WumpusLoneliness from "@/app/components/Svgs/Wumpus/WumpusLoneliness";
import WumpusPig from "@/app/components/Svgs/Wumpus/WumpusPig";

const WaitSt = () => {
    return (
        <section className={`waitSt-container`} style={{justifyContent: 'center'}}>
          {/*<Search />*/}
          <WumpusPig/>
          <p className={`wumpusText`}>대기중인 친구 요청이 없네요. 그래도 옆에 Wumpus는 있네요.</p>
        </section>
    )
}

export default WaitSt;
