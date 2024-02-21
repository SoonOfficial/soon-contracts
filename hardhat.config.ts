import {Fragment, FunctionFragment} from "ethers";
import {HardhatUserConfig} from "hardhat/config";
import networks from "./hardhat.network.json";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-abi-exporter";
import "hardhat-ignore-warnings";
// import "hardhat-diamond-abi";
import "dotenv/config";

const config: HardhatUserConfig = {
    // warnings: {
    //     'contracts/legacy/**/*': {
    //         default: 'warn',
    //     },
    // },
    // diamondAbi: {
    //     name: "DiamondCombined",
    //     include: ["Facet"],
    //     strict: true,
    //     filter: diamondFilterFunc,
    // },
    abiExporter: [{
        runOnCompile: true,
        clear: true,
        path: './abi-pure/general',
        format: "json"
    }, {
        runOnCompile: true,
        clear: true,
        path: './abi-pure/ethers',
        pretty: true
    }],
    networks: {
        hardhat: {
            chainId: 9999,
            mining: {
                interval: 500
            }
            // forking: {
            //   url: "https://arbitrum.public-rpc.com",
            //   // blockNumber: 132401260
            // }
        },
        localhost:{
            "chainId": 9999,
            "url": "http://127.0.0.1:8545/"
        },
        "bscTestnet": {
            "chainId": 97,
            "url": "https://endpoints.omniatech.io/v1/bsc/testnet/public",
            accounts: [process.env["PRIVATE_KEY"] as any],
        },
        // refresh: `sol networks`
        // ...tryWithPrivateKey(networks, process.env.PRIVATE_KEY)
    },
    etherscan: {
        apiKey: process.env["ETHERSCAN_bscTestnet"] as any
    },
    solidity: {
        compilers: [
            standardCompiler("0.8.20"),
        ]
    },
};

// ====================================================================================
// ***********                            [Helpers]                         ***********
// ====================================================================================
function standardCompiler(version: string) {
    return {
        version: version,
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            // viaIR: true
        },
    }
}

const funcNameSet = new Set<string>()
const funcSelectorMap = new Map<string, string>()
const eventErrorSet = new Set<string>()

function diamondFilterFunc(abiElement: any, index: number, fullAbi: any[], fullyQualifiedName: string) {
    if (fullyQualifiedName.endsWith("Test1Facet") || fullyQualifiedName.endsWith("Test2Facet")) {
        return false
    }
    // distinct event and error
    if (abiElement.type === "event" || abiElement.type === "error") {
        const minimalAbi = Fragment.from(abiElement).format("minimal")
        if (eventErrorSet.has(minimalAbi)) {
            return false
        }
        eventErrorSet.add(minimalAbi)
        return true;
    }
    const selector = FunctionFragment.from(abiElement).selector
    if (funcSelectorMap.has(selector)) {
        throw new Error(`${FunctionFragment.from(abiElement).selector}, see:\n\t${Fragment.from(abiElement).format("minimal")}::${fullyQualifiedName}\n\t${funcSelectorMap.get(selector)}\n`)
    }
    funcSelectorMap.set(selector, `${Fragment.from(abiElement).format("minimal")}::${fullyQualifiedName}`)
    if (!funcNameSet.has(fullyQualifiedName)) {
        funcNameSet.add(fullyQualifiedName)
        console.log(` >>> [hardhat-diamond-abi] ${fullyQualifiedName}`)
    }
    return true;
}

function tryWithPrivateKey(networks: any, privateKey?: any) {
    if (privateKey) {
        if (!<string>privateKey.startsWith("0x")) privateKey = "0x" + privateKey;
        for (const network in networks) {
            networks[network].accounts = [privateKey]
        }
        return networks
    }
    return networks
}

function tryWithApiKey(networks: {} & any, env?: any) {
    let apiKey: { [network: string]: string } = {}
    if (env) {
        for (let network in networks) {
            if (env[`ETHERSCAN_${network}`]) {
                apiKey[network] = env[`ETHERSCAN_${network}`]
            }
        }
    }
    return apiKey
}

export default config;
