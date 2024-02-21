import {ethers} from "ethers";
import {SoonICO} from "../typechain-types";
import ABI from "../abi-pure/general/contracts/SoonICO.sol/SoonICO.json";

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545/");
    const ico = new ethers.Contract("0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", ABI, provider) as any as SoonICO;
    const info = await ico.info()
    console.log(info.initialAmount)
    console.log(info.remainingAmount)
    console.log(info.maxPurchaseLimit)
    console.log(info.startTime)
    console.log(info.deadline)

    const res = await ico.purchase({value: 1n})
    await res.wait(1)
    console.log(await ico.userMapGet("0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

