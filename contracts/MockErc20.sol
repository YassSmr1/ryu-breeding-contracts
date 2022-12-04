// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockErc20 is ERC20 {
    constructor() ERC20("MockERC20", "MCK") {
        _mint(msg.sender, 2_000_000 * 1e18);
    }

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}
