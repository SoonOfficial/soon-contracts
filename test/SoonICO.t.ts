import {ethers} from "ethers";

function diamondPosition(id: string) {
    const hash1 = ethers.keccak256(Buffer.from(id));
    const hash2 = ethers.keccak256("0x" + (BigInt(hash1) - 1n).toString(16));
    return "0x" + (BigInt(hash2) & 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00n).toString(16)
}

// keccak256(abi.encode(uint256(keccak256("soon.storage.ico")) - 1)) & ~bytes32(uint256(0xff))
console.log(diamondPosition("soon.storage.ico"));
