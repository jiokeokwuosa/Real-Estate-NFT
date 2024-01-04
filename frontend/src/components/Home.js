import { useEffect, useState } from "react"

const Home = ({ home, provider, escrow, togglePop, account }) => {
  const [seller, setSeller] = useState()
  const [lender, setLender] = useState()
  const [inspector, setInspector] = useState()
  const [owner, setOwner] = useState()

  // activity tracker
  const [hasBought, setHasBought] = useState()
  const [hasSold, setHasSold] = useState()
  const [hasLended, setHasLended] = useState()
  const [hasInspected, setHasInspected] = useState()

  // activity handlers
  const buyHandler = async () => {
    const escrowAmount = await escrow.getEscrowAmount(home.id)
    const signer = await provider.getSigner()
    // buyer deposits down payment
    let transaction = await escrow
      .connect(signer)
      .depositDownPayment(home.id, { value: escrowAmount })
    await transaction.wait()

    // buyer approves the sale
    transaction = await escrow.connect(signer).approveSale(home.id)
    await transaction.wait()

    setHasBought(true)
  }

  const sellHandler = async () => {
    const signer = await provider.getSigner()
    let transaction = await escrow.connect(signer).approveSale(home.id)
    await transaction.wait()

    // finalize transaction
    transaction = await escrow.connect(signer).finalizeSale(home.id)
    await transaction.wait()

    setHasSold(true)
  }

  const lendHandler = async () => {
    const signer = await provider.getSigner()
    let transaction = await escrow.connect(signer).approveSale(home.id)
    await transaction.wait()

    // lender sends balance to the escrow contract!
    const lendAmount =
      (await escrow.getPurchasedPrice(home.id)) -
      (await escrow.getEscrowAmount(home.id))
    await signer.sendTransaction({
      to: escrow.getAddress(),
      value: lendAmount.toString(),
      gasLimit: 600000,
    })

    setHasLended(true)
  }

  const inspectHandler = async () => {
    const signer = await provider.getSigner()
    const transaction = await escrow
      .connect(signer)
      .updateInspectionStatus(home.id, true)
    await transaction.wait()

    setHasInspected(true)
  }

  const fetchDetails = async () => {
    // buyer
    const buyer = await escrow.getBuyer(home.id)
    const hasBought = await escrow.getApprovalStatus(home.id, buyer)
    setHasBought(hasBought)

    // seller
    const seller = await escrow.getSeller()
    setSeller(seller)
    const hasSold = await escrow.getApprovalStatus(home.id, seller)
    setHasSold(hasSold)

    // lender
    const lender = await escrow.getLender()
    setLender(lender)
    const hasLended = await escrow.getApprovalStatus(home.id, lender)
    setHasLended(hasLended)

    // inspector
    const inspector = await escrow.getInspector()
    setInspector(inspector)
    const hasInspected = await escrow.getApprovalStatus(home.id, inspector)
    setHasInspected(hasInspected)
  }

  const fetchOwner = async () => {
    if (await escrow.isNFTListed(home.id)) return
    const owner = await escrow.getBuyer(home.id)
    setOwner(owner)
  }

  useEffect(() => {
    const loadData = async () => {
      await fetchDetails()
      await fetchOwner()
    }
    loadData()
  }, [])

  return (
    <div className="home">
      <div className="home__details">
        <div className="home__image">
          <img alt="Property" src={home.image} />
        </div>
        <div className="home__overview">
          <h1>{home.name}</h1>
          <p>
            <strong>{home.attributes[2].value}</strong> beds |&nbsp;
            <strong>{home.attributes[3].value}</strong> baths |&nbsp;
            <strong>{home.attributes[4].value}</strong> sqft
          </p>
          <p>{home.address}</p>
          <h2>{home.attributes[0].value} Eth</h2>
          <div>
            {owner ? (
              <div className="home__owned">
                Owned by {owner.slice(0, 6) + "..." + owner.slice(36, 42)}
              </div>
            ) : (
              <div>
                {account == inspector ? (
                  <button
                    className="home__buy"
                    disabled={hasInspected}
                    onClick={inspectHandler}
                  >
                    Approve Inspection
                  </button>
                ) : account == lender ? (
                  <button
                    className="home__buy"
                    disabled={hasLended}
                    onClick={lendHandler}
                  >
                    Approve and Lend
                  </button>
                ) : account == seller ? (
                  <button
                    className="home__buy"
                    disabled={hasSold}
                    onClick={sellHandler}
                  >
                    Approve and Sell
                  </button>
                ) : (
                  <button
                    className="home__buy"
                    disabled={hasBought}
                    onClick={buyHandler}
                  >
                    Buy
                  </button>
                )}
              </div>
            )}
          </div>
          <button className="home__contact">Contact Agent</button>
          <hr />
          <h2>Overview</h2>
          <p> {home.description} </p>
          <hr />
          <h2>Facts and Features</h2>
          <ul>
            {home.attributes.map((attribute, index) => {
              return (
                <li key={index}>
                  <strong>{attribute.trait_type}</strong>: {attribute.value}
                </li>
              )
            })}
          </ul>
        </div>
        <button className="home__close" onClick={() => togglePop(false)}>
          X
        </button>
      </div>
    </div>
  )
}

export default Home
