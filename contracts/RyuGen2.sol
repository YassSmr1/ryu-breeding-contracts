// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IBreedingFactory.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721RoyaltyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";

///////////////////////////////////////////////////////////////////////////////////////////////
//                               Made by : Yassine SMARA                                     //
//                               GitHub :  https://github.com/YassineSMARA                   //
//                               Discord :  Krabs#9454                                       //
///////////////////////////////////////////////////////////////////////////////////////////////
contract RyuGen2 is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable
{
    using StringsUpgradeable for uint256;

    // The Egg image URI
    string public eggURI;

    // The base URI
    string public baseURI;

    // The max supply
    uint256 public maxSupply;

    // The Breeding Factory
    IBreedingFactory public breedingFactory;

    // The labs
    address public labs;

    // The tokenId to the timestamp of incubation end
    mapping(uint256 => uint256) public tokenIdToIncubationEnd;

    // The tokenId to Parents Id
    mapping(uint256 => uint256[2]) public tokenIdToParents;

    struct Gen2Details {
        uint256 id;
        uint256 incubationTime;
        string uri;
        uint256[2] parents;
    }

    event Breed(
        address indexed from,
        uint256 male,
        uint256 female,
        uint256 indexed newTokenId
    );

    event Identical(
        address indexed from,
        uint256 twinId,
        uint256 indexed newTokenId
    );

    function initialize() external initializer {
        __Ownable_init();
        __ERC721_init("Ryu Gen2", "Ryu G2");
        __ERC721Enumerable_init();

        eggURI = "https://ryupng.s3.amazonaws.com/json/";
        baseURI = "https://ryu-metadata.herokuapp.com/api/json/";
        maxSupply = 9999;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////   EXTERNAL   ////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Endpoint to mint a gen2 token
     *
     * Requirements:
     *
     * - Caller need to be BreedingFactory
     * - supply + _mintAmount should be <= Max Supply
     * @param to The address that will receive the new token
     * @param incubationEnd The incubation end of the new token
     * @param mintAmount The amount of gen2 to mint
     * @param male The male parent
     * @param female The female parent
     */
    function mint(
        address to,
        uint256 incubationEnd,
        uint256 mintAmount,
        uint256 male,
        uint256 female
    ) external onlyBreedingFactory checkSupply(mintAmount) {
        uint256 supply = totalSupply();
        for (uint256 i = 1; i <= mintAmount; i++) {
            uint256 tokenId = supply + i;
            _saveData(tokenId, incubationEnd, [male, female]);
            _safeMint(to, tokenId);
            emit Breed(to, male, female, tokenId);
        }
    }

    /**
     * @dev Endpoint to mint a gen2 token ( labs only )
     *
     * Requirements:
     *
     * - Caller need to be Labs
     * - supply + _mintAmount should be <= Max Supply
     * @param to The address that will receive the new token
     * @param twinId The twin id of the new token
     * @param identical Whether the new token is identical to the twin
     */
    function mintFromLabs(
        address to,
        uint256 twinId,
        bool identical
    ) external onlyLabs checkSupply(1) {
        uint256 tokenId = totalSupply() + 1;
        uint256[2] storage parentsId = tokenIdToParents[twinId];
        _saveData(tokenId, tokenIdToIncubationEnd[twinId], parentsId);
        _safeMint(to, tokenId);
        if (identical) emit Identical(to, twinId, tokenId);
        else emit Breed(to, parentsId[0], parentsId[1], tokenId);
    }

    /**
     * @dev Endpoint to divide by two incubation time
     *
     * Requirements:
     *
     * - Caller need to be BreedingFactory
     * @param tokenId The tokenId of the token to speed up
     */
    function speedUpIncubationTime(uint256 tokenId)
        external
        onlyBreedingFactory
    {
        uint256 deltaT = (tokenIdToIncubationEnd[tokenId] - block.timestamp) /
            2;
        tokenIdToIncubationEnd[tokenId] = block.timestamp + deltaT;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////   OnlyOwner  ////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * @dev Set the BreedingFactory (should be the breedingfactory)
     * @param newBreedingFactory The new breeding factory
     */
    function addBreedingFactory(address newBreedingFactory) external onlyOwner {
        breedingFactory = IBreedingFactory(newBreedingFactory);
    }

    /**
     * @dev Set the Labs
     * @param newLabs The new labs
     */
    function addLabs(address newLabs) external onlyOwner {
        labs = newLabs;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////   INTERNAL  /////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Save the data of the new token
     * @param tokenId The tokenId of the new token
     * @param incubationEnd The incubation end of the new token
     * @param parentsId The parents id of the new token
     */
    function _saveData(
        uint256 tokenId,
        uint256 incubationEnd,
        uint256[2] memory parentsId
    ) internal {
        tokenIdToIncubationEnd[tokenId] = incubationEnd;
        tokenIdToParents[tokenId] = parentsId;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        virtual
        override(ERC721Upgradeable)
    {
        super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////   MODIFIER  /////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Check supply requirements
     * @param mintAmount The amount of gen2 to mint
     */
    modifier checkSupply(uint256 mintAmount) {
        require(
            totalSupply() + mintAmount <= maxSupply,
            "Max supply exceedeed"
        );
        _;
    }

    /**
     * @dev Check if caller is the Bredding Master
     */
    modifier onlyBreedingFactory() {
        require(msg.sender == address(breedingFactory), "Not Breeding Factory");
        _;
    }

    /**
     * @dev Check if caller is the Labs
     */
    modifier onlyLabs() {
        require(msg.sender == labs, "Not Labs");
        _;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////     VIEW    /////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Return the tokenURI of tokenId.
     *    - eggURI if incubation time
     *    - baseURI if incubation time ended
     * @param tokenId The tokenId of the token
     */
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(tokenId), "URI query for nonexistent token");

        if (block.timestamp <= tokenIdToIncubationEnd[tokenId]) {
            uint256 delta = tokenIdToIncubationEnd[tokenId] - block.timestamp;
            if (delta >= (breedingFactory.incubationTime() * 2) / 3) {
                return string(abi.encodePacked(eggURI, "egg1.json"));
            } else if (delta >= breedingFactory.incubationTime() / 3) {
                return string(abi.encodePacked(eggURI, "egg2.json"));
            } else {
                return string(abi.encodePacked(eggURI, "egg3.json"));
            }
        }

        return
            string(abi.encodePacked(_baseURI(), tokenId.toString(), ".json"));
    }

    /**
     * @dev return the baseURI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    /**
     * @dev Return all the nft's of _user
     * @param user The user to get the nft's of
     */
    function walletOfOwner(address user)
        external
        view
        returns (Gen2Details[] memory)
    {
        uint256 ownerTokenCount = balanceOf(user);
        Gen2Details[] memory details = new Gen2Details[](ownerTokenCount);
        for (uint256 i = 0; i < ownerTokenCount; i++) {
            uint256 id = tokenOfOwnerByIndex(user, i);
            details[i] = Gen2Details({
                id: id,
                incubationTime: tokenIdToIncubationEnd[id],
                uri: tokenURI(id),
                parents: tokenIdToParents[id]
            });
        }
        return details;
    }
}
