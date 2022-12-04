// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IRyuGen1.sol";
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
contract BreedingFactory is Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // The breeding cost in $nRyu that is burned
    uint256 public breedingCost;

    // The bpBurned at each breeding
    uint256 public bpBreedingCostBurned;

    // The speedup cost in $nRyu
    uint256 public speedUpCost;

    // The second speed up cost in $nRyu
    uint256 public secondSpeedUpCost;

    // The breeding stamina cost for base dragons
    uint256 public breedingStaminaCostBase;

    // The breeding stamina cost for legendary dragons
    uint256 public breedingStaminaCostLegendary;

    // The incubation time
    uint256 public incubationTime;

    // The $nRyu token Contract
    IERC20Upgradeable public nRyu;

    // The gen1 Nft Contract
    IRyuGen1 public gen1;

    // The gen2 Nft Contract
    IRyuGen2 public gen2;

    // The treasury address
    address public treasury;

    // mapping from tokenId to Stamina
    mapping(uint256 => uint256) public tokenIdToStamina;

    // mapping tokenId to speedUp => 0 - 1 - 2, 2 is the limit
    mapping(uint256 => uint8) public speedUpLevel;

    /**
     * @dev Initializes the contract by setting the address of $nRyu token contract
     * and the Gen1 Nft contract, the gen2 nft contract and the treasury address
     */
    function initialize(
        address initNryu,
        address initGen1,
        address initGen2,
        address initTreasury
    ) external initializer {
        __Ownable_init();
        nRyu = IERC20Upgradeable(initNryu);
        gen1 = IRyuGen1(initGen1);
        gen2 = IRyuGen2(initGen2);
        treasury = initTreasury;

        breedingCost = 2000 ether;
        bpBreedingCostBurned = 9000;

        speedUpCost = 3300 ether;
        secondSpeedUpCost = 5500 ether;
        breedingStaminaCostBase = 10;
        breedingStaminaCostLegendary = 20;
        incubationTime = 33 days;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////   EXTERNAL   ////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Endpoint to breed a gen2 nft.
     *
     * Requirements:
     *
     * - msg.sender need to own _male and female
     * - male id should not be equal female id
     * - msg.sender should approve the contract to use his $nRyu tokens
     * @param male the male tokenId
     * @param female the female tokenId
     */
    function breed(uint256 male, uint256 female)
        external
        checkOwnership(male, female)
        checkSameNft(male, female)
        updateStamina(male, female)
    {
        _splitFunds(breedingCost, bpBreedingCostBurned);
        gen2.mint(
            msg.sender,
            block.timestamp + incubationTime,
            1,
            male,
            female
        );
    }

    /**
     * @dev Function to speed up the hatching of an egg
     *
     * Requirements :
     *
     * - msg.sender need to own the tokenId
     * - only two level-up is authorized
     * @param tokenId the tokenId of the token to speed up
     */
    function speedUp(uint256 tokenId)
        external
        isOwnerGen2(tokenId)
        updateSpeedUpLevel(tokenId)
    {
        if (speedUpLevel[tokenId] == 0) {
            speedUpLevel[tokenId]++;
            gen2.speedUpIncubationTime(tokenId);
            nRyu.safeTransferFrom(msg.sender, address(0xdead), speedUpCost);
        } else {
            speedUpLevel[tokenId]++;
            gen2.speedUpIncubationTime(tokenId);
            nRyu.safeTransferFrom(
                msg.sender,
                address(0xdead),
                secondSpeedUpCost
            );
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////   INTERNAL  /////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Split the funds of the msg.sender between treasury wallet and burning address
     */
    function _splitFunds(uint256 cost, uint256 bp) internal {
        uint256 burnedAmount = (cost * bp) / 10000;
        uint256 treasuryAmount = cost - burnedAmount;
        nRyu.safeTransferFrom(msg.sender, address(0xdead), burnedAmount);
        nRyu.safeTransferFrom(msg.sender, treasury, treasuryAmount);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////   Modifier   ////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Modifier to make a function callable only when the token1 id is not equal to token2 id
     *
     * Requirements:
     *
     * - token1 Id should not be equal to token2 Id
     */
    modifier checkSameNft(uint256 token1, uint256 token2) {
        require(token1 != token2, "U can't breed with same dragons");
        _;
    }

    /**
     * @dev Check if user is owner of the tokenId
     */
    modifier isOwnerGen2(uint256 tokenId) {
        require(gen2.ownerOf(tokenId) == msg.sender, "Owner only endpoint");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when msg.sender own token1 and token2
     *
     * Requirements:
     *
     * - owner of token1 && owner of token2 is the msg.sender
     */
    modifier checkOwnership(uint256 token1, uint256 token2) {
        require(
            gen1.ownerOf(token1) == msg.sender &&
                gen1.ownerOf(token2) == msg.sender,
            "U need to own both of dragons"
        );
        _;
    }

    /**
     * @dev Modifier that will update stamina of token1 depending of token1 and 2
     */
    modifier updateStamina(uint256 token1, uint256 token2) {
        uint256 cost;
        uint256 maxStamina;

        if (gen1.isLegend(token1)) maxStamina = 30;
        else maxStamina = 20;

        if (gen1.isLegend(token2)) cost = breedingStaminaCostLegendary;
        else cost = breedingStaminaCostBase;

        require(
            tokenIdToStamina[token1] + cost <= maxStamina,
            "U dont have enough stamina"
        );

        tokenIdToStamina[token1] += cost;
        _;
    }

    /**
     * @dev Return the speed up cost.
     * Revert if limit is reached
     */
    modifier updateSpeedUpLevel(uint256 tokenId) {
        require(
            block.timestamp <= gen2.tokenIdToIncubationEnd(tokenId),
            "Drake is already alive"
        );
        require(speedUpLevel[tokenId] < 2, "Speed up limit reached");
        _;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////   VIEW   ////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Return the stamina for each token in tokenIds
     * @param tokenIds the tokenIds
     */
    function getStaminaForTokens(uint256[] memory tokenIds)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory stamina = new uint256[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            stamina[i] = tokenIdToStamina[tokenIds[i]];
        }
        return stamina;
    }
}
