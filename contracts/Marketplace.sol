// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter public itemIds;

    address payable public immutable feeAccount;
    uint256 public immutable feePercent;

    constructor(uint256 _feePercent) {
        feeAccount = payable(owner());
        feePercent = _feePercent;
    }

    struct Item {
        uint256 itemId;
        uint256 tokenId;
        IERC721 nft;
        address payable seller;
        uint256 price;
        bool sold;
    }

    mapping(uint256 => Item) public idToItem;

    event ItemCreated(
        uint256 itemId,
        uint256 tokenId,
        address indexed nft,
        address indexed seller,
        uint256 price
    );

    event ItemBought(
        uint256 itemId,
        uint256 tokenId,
        address indexed nft,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );

    function createItem(
        uint256 _tokenId,
        uint256 _price,
        IERC721 _nft
    ) external nonReentrant {
        require(_price > 0, "Price must be greater than zero.");

        itemIds.increment();
        uint256 itemId = itemIds.current();

        idToItem[itemId] = Item(
            itemId,
            _tokenId,
            _nft,
            payable(msg.sender),
            _price,
            false
        );

        _nft.transferFrom(msg.sender, address(this), _tokenId);

        emit ItemCreated(itemId, _tokenId, address(_nft), msg.sender, _price);
    }

    function purchaseItem(uint256 _itemId) external payable nonReentrant {
        require(
            _itemId > 0 && _itemId <= itemIds.current(),
            "Item doesn't exist."
        );
        Item storage item = idToItem[_itemId];
        require(!item.sold, "Item already sold.");
        uint256 totalPrice = getTotalPrice(_itemId);
        require(msg.value == totalPrice, "Not enough funds.");

        item.sold = true;

        item.seller.transfer(item.price);
        feeAccount.transfer(totalPrice - item.price);
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);

        emit ItemBought(
            _itemId,
            item.tokenId,
            address(item.nft),
            item.seller,
            msg.sender,
            item.price
        );
    }

    function getTotalPrice(uint256 _itemId) public view returns (uint256) {
        return (idToItem[_itemId].price * (100 + feePercent)) / 100;
    }
}
