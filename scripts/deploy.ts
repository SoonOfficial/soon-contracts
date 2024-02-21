import {ethers, upgrades} from "hardhat";
import {SoonICO__factory} from "../typechain-types";


// 0x5D7A9F1b8e2E7892beC4d16e33B1E464548E604F SoonICO-proxy(main)
// 0x248b002d7ac57119806110ae070305e1f571823d SoonICO-admin
// 0x3d4600cdb654f544582de7c80f5847a3a59bff31 SoonICO-implementation
// 0x66d1a5f144f1d7e88b9df9e653f00a826a6f7982 SoonICO-implementation
async function main() {
    // await upgradeSoonICO("0x5D7A9F1b8e2E7892beC4d16e33B1E4645s48E604F")
    // await verify("SoonICO", "0x3d4600cdb654f544582de7c80f5847a3a59bff31")

    const [signer] = await ethers.getSigners()
    const ico = SoonICO__factory.connect("0x5D7A9F1b8e2E7892beC4d16e33B1E464548E604F", signer)
    await ico.setDeadline(new Date("2024-02-22").getTime() / 1000)
    // const startTIme = new Date("2024-02-10").getTime() / 1000
    // const deadline = startTIme + 5 * 24 * 60 * 60
    // const soon = ""
    // console.log([2000n * ethers.WeiPerEther, 5n * ethers.WeiPerEther / 10n, startTIme, deadline, soon])
    // await deploySoonICO([2000n * ethers.WeiPerEther, 5n * ethers.WeiPerEther / 10n, startTIme, deadline, soon])
}

async function deploySoonICO(initialArgs: any[], isVerify = false) {
    const Instance = await ethers.getContractFactory('SoonICO')
    const instance = await upgrades.deployProxy(Instance, initialArgs, {
        txOverrides: {gasLimit: 3000000}
    })
    await instance.waitForDeployment()
    console.log(instance.target, deploySoonICO.name.substring(6))
    await showProxy(instance);

    return instance
}

async function upgradeSoonICO(proxy: string) {
    const HdsStakingPool = await ethers.getContractFactory('SoonICO')
    const instance = await upgrades.upgradeProxy(proxy, HdsStakingPool, {
        txOverrides: {gasLimit: 3000000}
    })
    await instance.waitForDeployment()
    console.log(instance.target, upgradeSoonICO.name.substring(7))
    await showProxy(instance);
    return instance
}

async function showProxy(instance: any) {
    const admin = "0x" + (await instance!.runner!.provider!.getStorage(instance.target, "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103")).slice(26)
    const implementation = "0x" + (await instance!.runner!.provider!.getStorage(instance.target, "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc")).slice(26)
    console.log(`${admin} admin`)
    console.log(`${implementation} implementation`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

