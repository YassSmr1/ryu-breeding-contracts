// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockGen1 is ERC721Enumerable, Ownable {
    using Strings for uint256;
    string public baseURI;

    constructor() ERC721("RyuGen1", "RYU1") {
        baseURI = "https://ipfs.io/ipfs/QmShG5SvTx4bkUNTpVNwQKkEMhcyM5SmbfQSTGy7sZ9L9S/";
    }

    function mint(uint256 _mintAmount) public payable {
        uint256 supply = totalSupply();
        for (uint256 i = 1; i <= _mintAmount; i++) {
            _safeMint(msg.sender, supply + i);
        }
    }

    function walletOfOwner(address _owner)
        public
        view
        returns (uint256[] memory)
    {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(tokenId), "URI query for nonexistent token");

        return
            string(abi.encodePacked(_baseURI(), tokenId.toString(), ".json"));
    }

    function isLegend(uint256 nftId) external pure returns (bool) {
        if (nftId == 2 || nftId == 3) {
            return true;
        } else {
            return false;
        }
    }
}
