import './scss/OnlineSt.scss'
import Search from "@/app/components/Search";
import WumpusSadness from "@/app/components/Svgs/Wumpus/WumpusSadness";

const OnlineSt = () => {
    return (
        <section className={`onlineSt-container`} style={{justifyContent: 'center'}}>
          {/*<Search/>*/}
          <WumpusSadness/>
          <p className={`wumpusText`}>아무도 Wumpus와 놀고 싶지 않은가 봐요.</p>
        </section>
    )
}

export default OnlineSt;
