import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { describe } from "mocha";
import { Marketplace, Marketplace__factory, NFT, NFT__factory } from "../typechain-types";

const toWei = (num: number): BigNumber => ethers.utils.parseEther(num.toString());
const fromWei = (num: BigNumber): string => ethers.utils.formatEther(num);

describe("Marketplace", () => {
    let NFT: NFT__factory;
    let nft: NFT;
    let Marketplace: Marketplace__factory;
    let marketplace: Marketplace;
    let deployer: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    let addrs: Array<SignerWithAddress>;
    let feePercent: number = 1;
    let URI: string = "sample URI";

    beforeEach(async () => {
        NFT = await ethers.getContractFactory("NFT");
        Marketplace = await ethers.getContractFactory("Marketplace");

        [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

        nft = await NFT.deploy();
        marketplace = await Marketplace.deploy(feePercent);
    });

    describe("Deployment", () => {
        it("Should track the name and symbol of the NFT collection", async () => {
            const name: string = "NFT";
            const symbol: string = "NFT";

            expect(await nft.name()).to.equal(name);
            expect(await nft.symbol()).to.equal(symbol);
        });

        it("Should track feeAccount and feePercent of the marketplace", async () => {
            expect(await marketplace.feeAccount()).to.equal(deployer.address);
            expect(await (await marketplace.feePercent()).toNumber()).to.equal(feePercent);
        });
    });

    describe("Minting NFTs", () => {
        it("Should track each minted NFT", async () => {
            await nft.connect(addr1).mint(URI);

            expect(await (await nft.tokenIds()).toNumber()).to.equal(1);
            expect(await (await nft.balanceOf(addr1.address)).toNumber()).to.equal(1);
            expect(await nft.tokenURI(1)).to.equal(URI);

            await nft.connect(addr2).mint(URI);

            expect(await (await nft.tokenIds()).toNumber()).to.equal(2);
            expect(await (await nft.balanceOf(addr2.address)).toNumber()).to.equal(1);
            expect(await nft.tokenURI(2)).to.equal(URI);
        });
    });

    describe("Creating marketplace items", () => {
        let price: number = 1;

        beforeEach(async () => {
            await nft.connect(addr1).mint(URI);
            await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
        });


        it("Should track newly created item, transfer the NFT from seller to the marketplace and emit a ItemCreated event", async () => {
            await expect(marketplace.connect(addr1).createItem(1, toWei(price), nft.address))
                .to.emit(marketplace, "ItemCreated")
                .withArgs(
                    1,
                    1,
                    nft.address,
                    addr1.address,
                    toWei(price)
                );

            expect(await nft.ownerOf(1)).to.equal(marketplace.address);

            expect(await marketplace.itemIds()).to.equal(1);

            const item = await marketplace.idToItem(1);

            expect(item.itemId).to.equal(1);
            expect(item.tokenId).to.equal(1);
            expect(item.nft).to.equal(nft.address);
            expect(item.price).to.equal(toWei(price));
            expect(item.sold).to.equal(false);
        });

        it("Should fail if the price is set to zero", async () => {
            await expect(
                marketplace.connect(addr1).createItem(1, 0, nft.address)
            ).to.be.revertedWith("Price must be greater than zero");
        });
    });

    describe("Purchasing marketplace items", () => {
        let price: number = 2;
        let fee: number = (feePercent / 100) * price;
        let totalPriceInWei: BigNumber;

        beforeEach(async () => {
            await nft.connect(addr1).mint(URI);
            await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(addr1).createItem(1, toWei(price), nft.address);
        });

        it("Should update the item as sold, pay seller, transfer the NFT to the buyer, charge fees and emit a ItemBought event", async () => {
            const sellerInitalEthBal = await addr1.getBalance();
            const feeAccountInitialEthBal = await deployer.getBalance();

            totalPriceInWei = await marketplace.getTotalPrice(1);

            await expect(marketplace.connect(addr2).purchaseItem(1, { value: totalPriceInWei }))
                .to.emit(marketplace, "ItemBought")
                .withArgs(
                    1,
                    1,
                    nft.address,
                    addr1.address,
                    addr2.address,
                    toWei(price)
                );

            const sellerFinalEthBal = await addr1.getBalance();
            const feeAccountFinalEthBal = await deployer.getBalance();

            expect((await marketplace.idToItem(1)).sold).to.equal(true);
            expect(+fromWei(sellerFinalEthBal)).to.equal(+price + +fromWei(sellerInitalEthBal));
            expect(Number(+fromWei(feeAccountFinalEthBal)).toFixed(10)).to.equal(Number(+fee + +fromWei(feeAccountInitialEthBal)).toFixed(10));
            expect(await nft.ownerOf(1)).to.equal(addr2.address);
        });

        it("Should fail when provided with an invalid itemId, sold items and when the buyer has insufficient funds", async () => {
            await expect(
                marketplace.connect(addr2).purchaseItem(2, { value: totalPriceInWei })
            ).to.be.revertedWith("Item doesn't exist.");
            await expect(
                marketplace.connect(addr2).purchaseItem(0, { value: totalPriceInWei })
            ).to.be.revertedWith("Item doesn't exist.");
            await expect(
                marketplace.connect(addr2).purchaseItem(1, { value: toWei(price) })
            ).to.be.revertedWith("Not enough funds.");
            await marketplace.connect(addr2).purchaseItem(1, { value: totalPriceInWei })
            await expect(
                marketplace.connect(addrs[0]).purchaseItem(1, { value: totalPriceInWei })
            ).to.be.revertedWith("Item already sold.");
        });
    });
});