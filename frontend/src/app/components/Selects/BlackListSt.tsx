import './scss/BlackListSt.scss'
import WumpusEating from "@/app/components/Svgs/Wumpus/WumpusEating";

const BlackListSt = () => {
    return (
        <section className={`blackListSt-container`} style={{justifyContent: 'center'}}>
          {/*<Search/>*/}
          <WumpusEating/>
          <p className={`wumpusText`}>Wumpus는 차단 해제를 할 수 없어요.</p>
        </section>
    )
}

export default BlackListSt;
