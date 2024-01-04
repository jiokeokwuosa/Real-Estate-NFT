//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract RealEstate is ERC721URIStorage {
  uint256 private _tokenId;

  constructor() ERC721("Real Estate", "RE") {}

  function mint(string memory tokenURI) public returns (uint256) {
    ++_tokenId;

    _mint(msg.sender, _tokenId);
    _setTokenURI(_tokenId, tokenURI);

    return _tokenId;
  }

  // return the total supply
  function totalSupply() public view returns (uint256) {
    return _tokenId;
  }
}
