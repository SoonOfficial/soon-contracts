import {ethers} from "ethers";
import {SoonICO__factory} from "../typechain-types";

async function main() {
    const provider = new ethers.JsonRpcProvider("https://data-seed-prebsc-2-s2.bnbchain.org:8545")
    const runner = new ethers.Wallet("", provider)
    const whites = [
        "0x320282D9bFF97e3Be124F408286e3D8c5cB08c24",
        "0x2DAdaa4bc24CA3CB97eCDC40b6908D55C8eC9d0c",
        "0xe7020BDd5818F12B72bf6e71Cb07948e216F05Ca",
        "0x28f6f8F5056a2508A3935fdeebD5Add0A9e8eA46",
        "0xBB80FE141De649f185175C53E3c184e5032E414B",
    ]
    await sendEther(runner, whites)

    // const ico = SoonICO__factory.connect("0x5D7A9F1b8e2E7892beC4d16e33B1E464548E604F", runner)
    // let res = await ico.setWhites(whites)
    // let receipt = await res.wait()
    // console.log(receipt?.hash)
    // console.log(await ico.isWhite("0x320282D9bFF97e3Be124F408286e3D8c5cB08c24"))
}

async function sendEther(runner: ethers.Wallet, targets: string[]) {
    const nonce = await runner.getNonce()
    const proms = []
    for (let i = 0; i < targets.length; i++) {
        proms.push(runner.sendTransaction({to: targets[i], value: 1n * ethers.WeiPerEther, nonce: nonce + i}))
    }
    const res = await Promise.all(proms)
    for (let i = 0; i < res.length; i++) {
        console.log((await res[i].wait())?.hash)
    }
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

