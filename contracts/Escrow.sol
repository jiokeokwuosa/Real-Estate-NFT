//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
  function transferFrom(address _from, address _to, uint256 _id) external;
}

// Errors
error Escrow__OnlySeller(string message);
error Escrow__OnlyBuyer(string message);
error Escrow__NotEnoughDeposit(string message);
error Escrow__OnlyInspector(string message);
error Escrow__InspectionNotPassed(string message);
error Escrow__FailedApproval(string message);
error Escrow__InsufficientFund(string message);
error Escrow__PaymentFailed(string message);

contract Escrow {
  address private immutable LENDER;
  address private immutable INSPECTOR;
  address payable private immutable SELLER; // this is payable because the seller will recieve ether
  address private immutable NFTADDRESS;
  mapping(uint256 => bool) private isListed;
  mapping(uint256 => uint256) private purchasePrice;
  mapping(uint256 => uint256) private escrowAmount;
  mapping(uint256 => address) private buyer;
  mapping(uint256 => bool) private inspectionPassed;
  mapping(uint256 => mapping(address => bool)) private approval;

  // modifiers
  modifier onlySeller() {
    if (msg.sender != SELLER)
      revert Escrow__OnlySeller({message: "Only seller can list this nft"});
    _;
  }

  modifier onlyBuyer(uint256 _nftId) {
    if (msg.sender != this.getBuyer(_nftId))
      revert Escrow__OnlyBuyer({
        message: "Only buyer is allowed to make deposit"
      });
    _;
  }

  modifier onlyInspector() {
    if (msg.sender != this.getInspector())
      revert Escrow__OnlyInspector({
        message: "Only inspector is allowed to trigger this function"
      });
    _;
  }

  constructor(
    address _lender,
    address _inspector,
    address payable _seller,
    address _nftAddress
  ) {
    LENDER = _lender;
    INSPECTOR = _inspector;
    SELLER = _seller;
    NFTADDRESS = _nftAddress;
  }

  function list(
    uint256 _nftId,
    address _buyer,
    uint256 _purchasePrice,
    uint256 _escrowAmount
  ) public payable onlySeller {
    // transfer the nft from the seller's wallet to the escrow contract address
    IERC721(NFTADDRESS).transferFrom(msg.sender, address(this), _nftId);

    isListed[_nftId] = true;
    purchasePrice[_nftId] = _purchasePrice;
    escrowAmount[_nftId] = _escrowAmount;
    buyer[_nftId] = _buyer;
  }

  function depositDownPayment(uint256 _nftId) public payable onlyBuyer(_nftId) {
    if (msg.value < this.getEscrowAmount(_nftId))
      revert Escrow__NotEnoughDeposit({
        message: "Deposit amount not sufficient"
      });
  }

  function updateInspectionStatus(
    uint256 _nftId,
    bool status
  ) public onlyInspector {
    inspectionPassed[_nftId] = status;
  }

  function approveSale(uint256 _nftId) public {
    approval[_nftId][msg.sender] = true;
  }

  function finalizeSale(uint256 _nftId) public {
    if (this.getInspectionStatus(_nftId) == false)
      revert Escrow__InspectionNotPassed({
        message: "Inspection has not been passed"
      });
    if (this.getApprovalStatus(_nftId, buyer[_nftId]) == false)
      revert Escrow__FailedApproval({
        message: "Buyer has not approved this sale"
      });
    if (this.getApprovalStatus(_nftId, SELLER) == false)
      revert Escrow__FailedApproval({
        message: "Seller has not approved this sale"
      });
    if (this.getApprovalStatus(_nftId, LENDER) == false)
      revert Escrow__FailedApproval({
        message: "Lender has not approved this sale"
      });
    // check that the contract is funded
    if (address(this).balance < this.getPurchasedPrice(_nftId))
      revert Escrow__InsufficientFund({
        message: "Contract is not sufficiently funded"
      });

    // send the money to the seller
    (bool success, ) = payable(SELLER).call{value: address(this).balance}("");
    if (!success) revert Escrow__PaymentFailed({message: "Payment failed"});

    isListed[_nftId] = false;

    // transfer nft ownership to the buyer
    IERC721(NFTADDRESS).transferFrom(address(this), this.getBuyer(_nftId), _nftId);
  }

  // getter functions
  function getBalance() public view returns (uint256) {
    return address(this).balance;
  }

  function getLender() public view returns (address) {
    return LENDER;
  }

  function getInspector() public view returns (address) {
    return INSPECTOR;
  }

  function getSeller() public view returns (address) {
    return SELLER;
  }

  function getNFTAddress() public view returns (address) {
    return NFTADDRESS;
  }

  function isNFTListed(uint256 index) public view returns (bool) {
    return isListed[index];
  }

  function getBuyer(uint256 index) public view returns (address) {
    return buyer[index];
  }

  function getPurchasedPrice(uint256 index) public view returns (uint256) {
    return purchasePrice[index];
  }

  function getEscrowAmount(uint256 index) public view returns (uint256) {
    return escrowAmount[index];
  }

  function getInspectionStatus(uint256 index) public view returns (bool) {
    return inspectionPassed[index];
  }

  function getApprovalStatus(
    uint256 index,
    address approver
  ) public view returns (bool) {
    return approval[index][approver];
  }

  receive() external payable {
    // React to receiving ether
  }
}
