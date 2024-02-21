// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SoonICO.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract SoonICOT is Test {
    using Address for address payable;
    address private sender = address(0xf);
    address private boss = address(0x1);
    SoonICO private ico;

    function setUp() external {
        vm.label(sender, "owner");
        vm.label(boss, "boss");
        vm.startPrank(sender);
        vm.warp(1704067200000); // 2024-01-01T00:00:00.000Z
        ico = new SoonICO();
        ico.initialize(
            1000 ether,
            5 ether,
            uint32(block.timestamp),
            uint32(block.timestamp + 24 hours),
            boss
        );
        vm.stopPrank();
    }

    function test_OwnableUpgradeable() external {
        assertEq(ico.owner(), sender, "owner");

        vm.prank(sender);
        ico.transferOwnership(boss);
        assertEq(ico.owner(), boss, "transferOwnership");

        vm.prank(boss);
        ico.renounceOwnership();
        assertEq(ico.owner(), address(0), "renounceOwnership");
    }

    function test_POSITION() external {
        assertEq(keccak256(abi.encode(uint256(keccak256("soon.storage.ico")) - 1)) & ~bytes32(uint256(0xff)), 0xa017552bed4b313d6b7d98176b5d7003b9141ce3109c217fe359e28c7fbdfd00, "soon.storage.ico");
    }

    function test_purchase_modifier() external {
        // 01-onlyValued
        vm.expectRevert(SoonICO.PurchaseWithoutValue.selector);
        ico.purchase();

        // 02-onlyActive
        vm.expectRevert(SoonICO.ICONotActive.selector);
        vm.warp(1704067200000 - 1); // 2024-01-01T00:00:00.000Z -1
        vm.deal(sender, 100 ether);
        vm.prank(sender);
        ico.purchase{value: 1 ether}();

        vm.expectRevert(SoonICO.ICONotActive.selector);
        vm.warp(1704067200000 + 24 hours); // 2024-01-01T00:00:00.000Z -1
        vm.deal(sender, 100 ether);
        vm.prank(sender);
        ico.purchase{value: 1 ether}();

        // 03-onlyWhite
        vm.expectRevert(SoonICO.WhiteUnauthorizedAccount.selector);
        vm.warp(1704067200000); // 2024-01-01T00:00:00.000Z
        vm.deal(sender, 100 ether);
        vm.prank(sender);
        ico.purchase{value: 1 ether}();
    }

    function test_purchase_10_1() external {
        // buy: 10 ether + 1 ether => error
        vm.prank(sender);
        uint256[] memory users = new uint256[](1);
        users[0] = uint256(uint160(sender));
        ico.setWhites(users);

        vm.deal(address(ico), 0);
        vm.deal(boss, 0);
        vm.deal(sender, 100 ether);
        vm.prank(sender);
        ico.purchase{value: 10 ether}();
        assertEq(sender.balance, 95 ether, "sender 95e");
        assertEq(boss.balance, 5 ether, "boss 5e");
        assertEq(remainingAmount(), 995 ether, "remainingAmount");
        assertEq(ico.userMapGet(sender), 5 ether, "userMapGet");

        vm.expectRevert(SoonICO.PurchaseExcess.selector);
        vm.prank(sender);
        ico.purchase{value: 1 ether}();
    }

    function test_purchase_1_4_1() external {
        // buy: 1 ether + 4 ether + 1 ether => error
        vm.prank(sender);
        uint256[] memory users = new uint256[](1);
        users[0] = uint256(uint160(sender));
        ico.setWhites(users);

        vm.deal(address(ico), 0);
        vm.deal(boss, 0);
        vm.deal(sender, 100 ether);
        vm.prank(sender);
        ico.purchase{value: 1 ether}();
        assertEq(sender.balance, 99 ether, "sender 95e");
        assertEq(boss.balance, 1 ether, "boss 5e");
        assertEq(remainingAmount(), 999 ether, "remainingAmount");
        assertEq(ico.userMapGet(sender), 1 ether, "userMapGet 1");

        vm.prank(sender);
        ico.purchase{value: 4 ether}();
        assertEq(sender.balance, 95 ether, "sender 95e");
        assertEq(boss.balance, 5 ether, "boss 5e");
        assertEq(remainingAmount(), 995 ether, "remainingAmount");
        assertEq(ico.userMapGet(sender), 5 ether, "userMapGet 5");

        vm.expectRevert(SoonICO.PurchaseExcess.selector);
        vm.prank(sender);
        ico.purchase{value: 1 ether}();
    }

    function test_purchase_1_10_1() external {
        // buy: 1 ether + 10 ether + 1 ether => error
        vm.prank(sender);
        uint256[] memory users = new uint256[](1);
        users[0] = uint256(uint160(sender));
        ico.setWhites(users);

        vm.deal(address(ico), 0);
        vm.deal(boss, 0);
        vm.deal(sender, 100 ether);
        vm.prank(sender);
        ico.purchase{value: 1 ether}();
        assertEq(sender.balance, 99 ether, "sender 95e");
        assertEq(boss.balance, 1 ether, "boss 5e");
        assertEq(remainingAmount(), 999 ether, "remainingAmount");
        assertEq(ico.userMapGet(sender), 1 ether, "userMapGet 1");

        vm.prank(sender);
        ico.purchase{value: 10 ether}();
        assertEq(sender.balance, 95 ether, "sender 95e");
        assertEq(boss.balance, 5 ether, "boss 5e");
        assertEq(remainingAmount(), 995 ether, "remainingAmount");
        assertEq(ico.userMapGet(sender), 5 ether, "userMapGet 5");

        vm.expectRevert(SoonICO.PurchaseExcess.selector);
        vm.prank(sender);
        ico.purchase{value: 1 ether}();
    }

    function test_receive() external {
        // buy: 1 ether + 10 ether + 1 ether => error
        vm.prank(sender);
        uint256[] memory users = new uint256[](1);
        users[0] = uint256(uint160(sender));
        ico.setWhites(users);

        vm.deal(address(ico), 0);
        vm.deal(boss, 0);
        vm.deal(sender, 100 ether);
        vm.prank(sender);
        payable(ico).sendValue(1 ether);
        assertEq(sender.balance, 99 ether, "sender 95e");
        assertEq(boss.balance, 1 ether, "boss 5e");
        assertEq(remainingAmount(), 999 ether, "remainingAmount");
        assertEq(ico.userMapGet(sender), 1 ether, "userMapGet 1");

        vm.prank(sender);
        payable(ico).sendValue(10 ether);
        assertEq(sender.balance, 95 ether, "sender 95e");
        assertEq(boss.balance, 5 ether, "boss 5e");
        assertEq(remainingAmount(), 995 ether, "remainingAmount");
        assertEq(ico.userMapGet(sender), 5 ether, "userMapGet 5");

        vm.expectRevert(SoonICO.PurchaseExcess.selector);
        vm.prank(sender);
        payable(ico).sendValue(1 ether);
    }

    function test_receive_modifier() external {
        // 02-onlyActive
        vm.expectRevert(SoonICO.ICONotActive.selector);
        vm.warp(1704067200000 - 1); // 2024-01-01T00:00:00.000Z -1
        vm.deal(sender, 100 ether);
        vm.prank(sender);
        payable(ico).sendValue(1 ether);

        vm.expectRevert(SoonICO.ICONotActive.selector);
        vm.warp(1704067200000 + 24 hours); // 2024-01-01T00:00:00.000Z -1
        vm.deal(sender, 100 ether);
        vm.prank(sender);
        payable(ico).sendValue(1 ether);

        // 03-onlyWhite
        vm.expectRevert(SoonICO.WhiteUnauthorizedAccount.selector);
        vm.warp(1704067200000); // 2024-01-01T00:00:00.000Z
        vm.deal(sender, 100 ether);
        vm.prank(sender);
        payable(ico).sendValue(1 ether);
    }

    function remainingAmount() public view returns (uint256){
        return uint256(ico.info().remainingAmount);
    }
}
