import { useEffect, useState } from "react"
import { BrowserProvider, Contract, getAddress } from "ethers"

// Components
import Navigation from "../components/Navigation"
import Search from "../components/Search"
import Home from "../components/Home"

// ABIs
import RealEstate from "../abis/RealEstate.json"
import Escrow from "../abis/Escrow.json"

// Config
import { networkConfig } from "../config"

interface Ihome {
  name: string,
  address: string,
  description: string,
  image: string,
  id: string,
  attributes: Array<{
    trait_type: string,
    value: number
  }>
}

function App() {
  const [account, setAccount] = useState('')
  const [provider, setProvider] = useState<BrowserProvider>()
  const [homes, setHomes] = useState<Array<Ihome>>()
  const [home, setHome] = useState<Ihome>()
  const [toggle, setToggle] = useState(false)
  const [escrow, setEscrow] = useState<Contract>()

  const loadBloackChainData = async () => {
    const web3Provider = new BrowserProvider(window.ethereum);
    setProvider(web3Provider)

    const network = await web3Provider.getNetwork()
    const chainId = +network.chainId.toString()

    // get the javascript version of the contract
    const realEstate = new Contract(`${networkConfig[chainId].realEstate.address}`, RealEstate, web3Provider)

    // load all the properties with a for loop since we know the total nfts we have
    // note that the list of nfts in the blockchain is not an array
    const totalSupply = await realEstate.totalSupply()
    console.log(totalSupply)
    const homes: Array<Ihome> = []

    for (let index = 1; index <= +totalSupply.toString(); index++) {
      const uri = await realEstate.tokenURI(index)
      const response = await fetch(uri)
      const metadata = await response.json()
      homes.push(metadata)
    }
    setHomes(homes)

    const escrow = new Contract(`${networkConfig[chainId].escrow.address}`, Escrow, web3Provider)
    setEscrow(escrow)

    // monitor metamask account change
    window.ethereum.on('accountsChanged', async () => {
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      setAccount(getAddress(accounts[0]))
    })

  }

  const toggleProps = (home:Ihome) => {
    setHome(home)
    setToggle(!toggle)
  }

  const displayProperties = () => {
    if (homes && homes.length > 0) {
      return homes.map((home, index) => {
        return <div className="card" key={index} onClick={()=> toggleProps(home)}>
          <div className="card__image">
            <img alt="Luxury apartments" src={home.image} />
          </div>
          <div className="card__info">
            <h4>{home.attributes[0].value} Eth</h4>
            <p>
              <strong>{home.attributes[2].value}</strong> beds |&nbsp;
              <strong>{home.attributes[3].value}</strong> baths |&nbsp;
              <strong>{home.attributes[4].value}</strong> sqft
            </p>
            <p>{home.address}</p>
          </div>
        </div>
      })
    }
  }

  useEffect(() => {
    loadBloackChainData()
  }, [])
  return (
    <div>
      <Navigation web3Provider={provider} account={account} setAccount={setAccount} />
      <Search />
      <div className="cards__section">
        <h3>Welcome to our luxury apartments</h3>
        <hr />
        <div className="cards">
          {displayProperties()}
        </div>
      </div>
      { toggle && (
        <Home home={home} provider={provider} escrow = {escrow} togglePop ={setToggle}  account={account} />
      )}
    </div>
  )
}

export default App
