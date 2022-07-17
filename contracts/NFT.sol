// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter public tokenIds;

    constructor() ERC721("NFT", "NFT") {}

    function mint(string memory _tokenURI) public returns (uint256) {
         tokenIds.increment();
         uint256 tokenId = tokenIds.current();

         _mint(msg.sender, tokenId);
         _setTokenURI(tokenId, _tokenURI);

         return tokenId;
    }
}