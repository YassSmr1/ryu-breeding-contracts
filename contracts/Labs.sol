// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IRyuGen2.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

///////////////////////////////////////////////////////////////////////////////////////////////
//                               Made by : Yassine SMARA                                     //
//                               GitHub :  https://github.com/YassineSMARA                   //
//                               Discord :  Krabs#9454                                       //
///////////////////////////////////////////////////////////////////////////////////////////////
contract Labs is Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    // The potions enum
    enum Potions {
        Fraternal,
        StripDown,
        Identical
    }

    // The bpBurned for each potion usage
    uint256 public bpBurned;

    // The speedup cost for each potion usage
    mapping(Potions => uint256) public costs;

    // The speedup usage for each potion
    mapping(Potions => uint256) public usages;

    // The speedup max usage for each potion
    mapping(Potions => uint256) public maxUsages;

    // Check if the potion is already on a token with same parents
    mapping(Potions => mapping(uint256 => mapping(uint256 => bool)))
        public isPotionUsed;

    mapping(uint256 => bool) public isBoosted;

    // The nRyu token
    IERC20Upgradeable public nRyu;

    // The gen2 Nft Contract
    IRyuGen2 public gen2;

    // The treasury address
    address public treasury;

    event StripDown(address indexed from, uint256 indexed tokenId);

    /**
     * @dev Initializes the contract by setting the address of $nRyu token contract
     * and the Gen1 Nft contract, and the legendary tokensIds
     * @param initNryu The address of the $nRyu token contract
     * @param initGen2 The address of the Gen2 Nft contract
     * @param initTreasury The address of the treasury
     */
    function initialize(
        address initNryu,
        address initGen2,
        address initTreasury
    ) external initializer {
        __Ownable_init();
        nRyu = IERC20Upgradeable(initNryu);
        gen2 = IRyuGen2(initGen2);
        treasury = initTreasury;

        bpBurned = 6000;

        maxUsages[Potions.Fraternal] = 3000;
        costs[Potions.Fraternal] = 7500 ether;

        maxUsages[Potions.StripDown] = 1000;
        costs[Potions.StripDown] = 5000 ether;

        maxUsages[Potions.Identical] = 2500;
        costs[Potions.Identical] = 15000 ether;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////   EXTERNAL   ////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Create a new identical NFT of tokenID | The properties are builded off-chain
     * @param tokenId The token on which the potion is used
     */
    function identicalTwins(uint256 tokenId)
        external
        isOwnerGen2(tokenId)
        onlyOnHatched(tokenId)
        usePotion(tokenId, Potions.Identical)
    {
        _splitFunds(costs[Potions.Identical]);
        gen2.mintFromLabs(msg.sender, tokenId, true);
    }

    /**
     * @dev Create a new NFT from the same parents of tokenId | The properties are builded off-chain
     * @param tokenId The token on which the potion is used
     */
    function fraternalTwins(uint256 tokenId)
        external
        isOwnerGen2(tokenId)
        usePotion(tokenId, Potions.Fraternal)
    {
        _splitFunds(costs[Potions.Fraternal]);
        gen2.mintFromLabs(msg.sender, tokenId, false);
    }

    /**
     * @dev Remove all the properties of tokenID except Body and Background | The properties are builded off-chain
     * @param tokenId The token on which the potion is used
     */
    function stripDown(uint256 tokenId)
        external
        isOwnerGen2(tokenId)
        onlyOnHatched(tokenId)
        usePotion(tokenId, Potions.StripDown)
    {
        _splitFunds(costs[Potions.StripDown]);
        emit StripDown(msg.sender, tokenId);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////   INTERNAL  /////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Split the funds of the msg.sender between treasury wallet and burning address
     * @param amount The amount to split
     */
    function _splitFunds(uint256 amount) internal {
        uint256 burnedAmount = (amount * bpBurned) / 10000;
        uint256 treasuryAmount = amount - burnedAmount;
        nRyu.safeTransferFrom(msg.sender, address(0xdead), burnedAmount);
        nRyu.safeTransferFrom(msg.sender, treasury, treasuryAmount);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////   MODIFIER  /////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Check
     *   - If the potion is already used on a token with same parents
     *   - If the potion supply is not over
     *   - Update both supply and usage of the potion on the token
     * @param tokenId The token on which the potion is used
     * @param potion The potion to check
     */
    modifier usePotion(uint256 tokenId, Potions potion) {
        require(
            usages[potion] + 1 <= maxUsages[potion],
            "Potion supply exceeded"
        );
        usages[potion]++;

        uint256 parentMale = gen2.tokenIdToParents(tokenId, 0);
        uint256 parentFemale = gen2.tokenIdToParents(tokenId, 1);

        require(
            !isPotionUsed[potion][parentMale][parentFemale],
            "Already used on these parents"
        );
        isPotionUsed[potion][parentMale][parentFemale] = true;
        _;
    }

    /**
     * @dev Check if user is owner of the tokenId
     * @param tokenId The token to check
     */
    modifier isOwnerGen2(uint256 tokenId) {
        require(gen2.ownerOf(tokenId) == msg.sender, "Owner only endpoint");
        _;
    }

    /**
     * @dev Check if gen2 nft is hatched
     * @param tokenId The token to check
     */
    modifier onlyOnHatched(uint256 tokenId) {
        require(
            block.timestamp >= gen2.tokenIdToIncubationEnd(tokenId),
            "Only on hatched eggs"
        );
        _;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////     VIEW    /////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Get the potion usages for a token
     * @param tokenId The token to check
     * @return usageForToken a bool array representing the potion usages for the token
     */
    function getPotionsUsageForToken(uint256 tokenId)
        external
        view
        returns (bool[3] memory usageForToken)
    {
        uint256 parentMale = gen2.tokenIdToParents(tokenId, 0);
        uint256 parentFemale = gen2.tokenIdToParents(tokenId, 1);
        return [
            !isPotionUsed[Potions.Fraternal][parentMale][parentFemale] &&
                usages[Potions.Fraternal] + 1 <= maxUsages[Potions.Fraternal],
            !isPotionUsed[Potions.StripDown][parentMale][parentFemale] &&
                usages[Potions.StripDown] + 1 <= maxUsages[Potions.StripDown] &&
                block.timestamp >= gen2.tokenIdToIncubationEnd(tokenId),
            !isPotionUsed[Potions.Identical][parentMale][parentFemale] &&
                usages[Potions.Identical] + 1 <= maxUsages[Potions.Identical] &&
                block.timestamp >= gen2.tokenIdToIncubationEnd(tokenId)
        ];
    }
}
