interface Map {
  [key: number]: {
    realEstate: {
      address: string
    },
    escrow: {
      address: string
    }
  }
}

export const networkConfig:Map = {
  31337: {
    realEstate: {
      address: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    },
    escrow: {
      address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    }
  },
}
