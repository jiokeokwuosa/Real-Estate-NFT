
import { getAddress } from "ethers"

const Navigation = ({ web3Provider, account, setAccount }) => {
    const connectToWallet = async () => {
        const accounts = await web3Provider.send("eth_requestAccounts", []);
        setAccount(getAddress(accounts[0]))
    }
    return (
        <nav>
            <ul className="nav__links">
                <li><a href="#">Buy</a></li>
                <li><a href="#">Sell</a></li>
                <li><a href="#">Rent</a></li>
            </ul>
            <div className="nav__brand">
                <h1>CJ</h1>
            </div>
            {
                account ?
                    <button className="nav__connect" type="button">
                        {account.slice(0, 6) + '...' + account.slice(36, 42)}
                    </button> :
                    <button className="nav__connect" type="button" onClick={connectToWallet}>
                        Connect
                    </button>
            }

        </nav>
    )
}
export default Navigation
