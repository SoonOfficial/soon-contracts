import {ethers, network, run} from "hardhat";
import {BaseContract} from "ethers";
import fs from "fs";
import path from "path";
import logger from "./logger";

export async function deploy(isVerify: boolean, ...names: (string | [string, any[]])[]): Promise<(BaseContract & { address: string }) []> {
    const instances = await _deploy(...names)
    if (isVerify) {
        if (network.name !== "hardhat") {
            await new Promise(resolve => setTimeout(resolve, 1000))
            logger.info("verify......")
            await new Promise(resolve => setTimeout(resolve, 1000))
            for (let i = 0; i < names.length; i++) {
                let info = names[i]
                if (typeof info === 'string') {
                    await verify(info, instances[i].address)
                } else {
                    if (info.length != 2 || info[1] == undefined) {
                        continue
                    }
                    await verify(info[0], instances[i].address, ...info[1])
                }
            }
        } else {
            logger.warning("[hardhat] verify ignored")
        }
    }
    return instances
}

async function _deploy(...names: (string | [string, any[]])[]): Promise<(BaseContract & { address: string }) []> {
    const accounts = await ethers.getSigners()
    logger.log(`${"Deployer".padStart(20, "-")}  ${accounts[0].address} ${("[" + network.name + "]").padEnd(20, "-")}`)
    const promFuncs = []
    for (let info of names) {
        promFuncs.push((async () => {
            let name: string, prom: any;
            if (typeof info === 'string') {
                const Instance = await ethers.getContractFactory(info)
                prom = Instance.deploy()
                name = info
            } else {
                const Instance = await ethers.getContractFactory(info[0])
                if (info.length != 2 || info[1] == undefined) {
                    logger.error(`ERROR params: name = ${info[0]}, args = ${info[1]}`)
                    // @ts-ignore
                    return
                }
                prom = Instance.deploy(...info[1])
                name = info[0]
            }
            prom.then(async (contract: any) => {
                contract.address = await contract.getAddress()
                logger.info(`${name.padEnd(20)}: ${contract.address} [DeployedHash: ${contract.deploymentTransaction().hash}]`)
                return contract
            }).catch((e: Error) => {
                logger.info(`ERROR "${name}" Deployed Failed: args = [${typeof info === 'string' ? "null" : info[1]}] : ${e.message}`)
            })
            return prom
        })())
    }
    const instances = (await Promise.all(await Promise.all(promFuncs))).filter((c) => c)
    if (names.length != instances.length) {
        logger.error("Error exist")
        process.exit(1)
    }
    return instances;
}

// https://github.com/NomicFoundation/hardhat/tree/main/packages/hardhat-verify
export async function verify(name: string, address: string, ...args: any) {
    await run("verify:verify", {
        contract: `${parseVerifyPath(name)}:${name}`,
        address: address,
        constructorArguments: args ?? [],
    });
}

function parseVerifyPath(filename: string, rootDir?: string): string {
    let rootDirectory = rootDir ?? __dirname
    while (1) {
        let files = fs.readdirSync(rootDirectory)
        if (files.includes("package.json") && files.includes("contracts")) {
            rootDirectory = path.join(rootDirectory, files[files.indexOf("contracts")])
            break
        }
        let newRootDirectory = path.join(rootDirectory, "../")
        if (rootDirectory === newRootDirectory) {
            logger.error(`Error: Can't find any contract project: from=${rootDirectory} to=${__dirname}`)
            process.exit(1)
        }
        rootDirectory = newRootDirectory
    }
    if (!filename.endsWith(".sol")) {
        filename = filename.trim() + ".sol"
    }
    let targetFile: string = "";
    const findFile = (rootDirectory: string) => {
        const files = fs.readdirSync(rootDirectory);
        for (let file of files) {
            const filePath = path.join(rootDirectory, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                if (targetFile) return;
                findFile(filePath);
            } else if (stats.isFile()) {
                if (file === filename) {
                    targetFile = filePath
                    return
                }
            }
        }
    }
    findFile(rootDirectory)
    if (!targetFile) {
        logger.error(`Error: Can't find file: ${filename}`)
        process.exit(1)
    }
    return targetFile.replace(rootDirectory, "contracts").replace(/\\/g, "/");
}
