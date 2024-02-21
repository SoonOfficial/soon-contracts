// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract SoonICO is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using Address for address payable;
    using BitMaps for BitMaps.BitMap;
    using EnumerableMap for EnumerableMap.AddressToUintMap;

    // keccak256(abi.encode(uint256(keccak256("soon.storage.ico")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant POSITION = 0xa017552bed4b313d6b7d98176b5d7003b9141ce3109c217fe359e28c7fbdfd00;

    struct $Storage {
        BitMaps.BitMap _whiteMap;
        EnumerableMap.AddressToUintMap _userMap;
        uint256 initialAmount;
        uint112 remainingAmount;
        uint112 maxPurchaseLimit;
        uint32 startTime;
        uint32 deadline;
        address soon;
    }

    error WhiteUnauthorizedAccount();
    error ICONotActive();
    error PurchaseExcess();
    error PurchaseWithoutValue();

    function initialize(
        uint112 initialAmount,
        uint112 maxPurchaseLimit,
        uint32 startTime,
        uint32 deadline,
        address soon
    ) initializer external {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();

        $Storage storage $ = Storage();
        $.initialAmount = initialAmount; // 2000
        $.remainingAmount = initialAmount - 37268e16; // 372.68
        $.maxPurchaseLimit = maxPurchaseLimit;
        $.startTime = startTime;
        $.deadline = deadline;
        $.soon = soon;
    }

    function Storage() internal pure returns ($Storage storage $) {
        assembly {
            $.slot := POSITION
        }
        return $;
    }

    modifier onlyValued() {
        if (msg.value == 0) {
            revert PurchaseWithoutValue();
        }
        _;
    }

    event Purchase(address indexed account, uint256 amount);

    function purchase() onlyValued onlyActive onlyWhite nonReentrant payable public {
        $Storage storage $ = Storage();
        uint256 remainingAmount = uint256($.remainingAmount);
        uint256 maxPurchaseLimit = uint256($.maxPurchaseLimit);

        address msgSender = _msgSender();

        // gas saving
        uint256 purchased = uint256($._userMap._inner._values[bytes32(uint256(uint160(msgSender)))]);
        if (purchased >= maxPurchaseLimit) {
            revert PurchaseExcess();
        }

        uint256 msgValue = msg.value;
        unchecked {
            uint256 availablePurchase = maxPurchaseLimit - purchased;
            if (availablePurchase > remainingAmount) {
                availablePurchase = remainingAmount;
            }
            if (msgValue > availablePurchase) {
                payable(msgSender).sendValue(msgValue - availablePurchase);
            } else {
                availablePurchase = msgValue;
            }

            $.remainingAmount = uint112(remainingAmount - availablePurchase);
            $._userMap.set(msgSender, purchased + availablePurchase);
            emit Purchase(msgSender, availablePurchase);
        }
        // TODO reduce the number of transfers
        payable($.soon).sendValue(address(this).balance);
    }

    function getRemainingAmount() external view returns (uint256){
        return Storage().remainingAmount;
    }

    function userMapLength() external view returns (uint256){
        return Storage()._userMap.length();
    }

    function userMapAt(uint256 index) external view returns (address, uint256) {
        return Storage()._userMap.at(index);
    }

    function userMapGet(address user) external view returns (uint256){
        return uint256(Storage()._userMap._inner._values[bytes32(uint256(uint160(user)))]);
    }

    function userMapKeys() external view returns (address[] memory){
        return Storage()._userMap.keys();
    }

    event SetWhites(uint256[] users);

    function setWhites(uint256[] memory users) onlyOwner external {
        for (uint256 i = 0; i < users.length; i++) {
            Storage()._whiteMap.set(users[i]);
        }
        emit SetWhites(users);
    }

    event DelWhites(uint256[] users);

    function delWhites(uint256[] memory users) onlyOwner external {
        for (uint256 i = 0; i < users.length; i++) {
            Storage()._whiteMap.unset(users[i]);
        }
        emit DelWhites(users);
    }

    function isWhite(address account) public view returns (bool){
        return Storage()._whiteMap.get(uint256(uint160(account)));
    }

    modifier onlyWhite() {
        if (!isWhite(_msgSender())) {
            revert WhiteUnauthorizedAccount();
        }
        _;
    }

    function isActive() public view returns (bool){
        $Storage storage $ = Storage();
        uint32 _timestamp = uint32(block.timestamp);
        return _timestamp >= $.startTime && _timestamp < $.deadline && $.remainingAmount > 0;
    }

    modifier onlyActive() {
        if (!isActive()) {
            revert ICONotActive();
        }
        _;
    }

    struct ICOInfo {
        uint256 initialAmount;
        uint112 remainingAmount;
        uint112 maxPurchaseLimit;
        uint32 startTime;
        uint32 deadline;
    }

    function info() external view returns (ICOInfo memory i){
        $Storage storage $ = Storage();
        i = ICOInfo({
            initialAmount: $.initialAmount,
            remainingAmount: $.remainingAmount,
            maxPurchaseLimit: $.maxPurchaseLimit,
            startTime: $.startTime,
            deadline: $.deadline
        });
        return i;
    }

    event SetDeadline(uint256 deadline);

    function setDeadline(uint32 deadline) onlyOwner external {
        $Storage storage $ = Storage();
        $.deadline = deadline;

        emit SetDeadline(deadline);
    }

    receive() external payable {
        purchase();
    }
}
