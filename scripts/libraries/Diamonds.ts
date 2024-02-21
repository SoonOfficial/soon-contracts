import {
    AddressLike,
    BaseContract,
    BytesLike,
    Contract,
    ContractRunner,
    FunctionFragment,
} from "ethers"
import { ethers } from "hardhat"
import { DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet } from "./typechain-types"
import { deploy } from "./deployLib"
import DiamondAbi from "./abi/Diamond.json"

export type Diamond = DiamondCutFacet & DiamondLoupeFacet & OwnershipFacet & {

    address: string,
    logic?: {
        diamondCutFacet: string,
        diamondLoupeFacet: string,
        ownershipFacet: string,
    },
    proxy: typeof DiamondAction.prototype.proxy,
    encodeProxy: typeof DiamondAction.prototype.encodeProxy,
    upgrade: typeof DiamondAction.prototype.upgrade,
    encodeUpgrade: typeof DiamondAction.prototype.encodeUpgrade,
}

export const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

export type Selectors = string[] & {
    contract: BaseContract,
    clone: (functionNameOrSigs: string[], exclude?: boolean) => Selectors,
    names: () => { [name: string]: string }
}

export class Diamonds {
    static deploy = async (isVerify: boolean): Promise<Diamond> => {
        const owner = (await ethers.getSigners())[0]
        const [
            diamondInit,
            diamondCutFacet,
            diamondLoupeFacet,
            ownershipFacet,
        ] = await deploy(isVerify, "DiamondInit", "DiamondCutFacet", "DiamondLoupeFacet", "OwnershipFacet")
        //
        const [diamondProxy] = await deploy(isVerify, ["Diamond", [owner.address, diamondCutFacet.address]])

        //
        const diamond = new Contract(diamondProxy.address, DiamondAbi, owner) as any as Diamond
        diamond.address = diamondProxy.address
        diamond.logic = {
            diamondCutFacet: diamondCutFacet.address,
            diamondLoupeFacet: diamondLoupeFacet.address,
            ownershipFacet: ownershipFacet.address,
        }

        //
        const tx = await diamond.diamondCut([
            {
                facetAddress: diamondLoupeFacet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamonds.parseSelectors(diamondLoupeFacet),
            },
            {
                facetAddress: ownershipFacet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamonds.parseSelectors(ownershipFacet),
            }
        ], diamondInit.address, diamondInit.interface.encodeFunctionData("init"))
        await tx.wait()

        //
        return Diamonds.withAction(diamond)
    }

    static from = (diamond: string, runner?: ContractRunner | null | undefined): Diamond => {
        //
        return Diamonds.withAction(new Contract(diamond, DiamondAbi, runner) as any as Diamond)
    }

    static parseSelectors = (contract: BaseContract, funcHeaderOrSigs?: string[]) => {
        let selectors: Selectors = [] as any

        contract.interface.forEachFunction((func: FunctionFragment) => {
            selectors.push(func.selector)
        })

        selectors.contract = contract

        selectors.names = function () {
            let names = {} as { [name: string]: string }
            contract.interface.forEachFunction((func: FunctionFragment) => {
                for (let selector of this) {
                    if (func.selector == selector) {
                        names[selector] = func.format("minimal")
                        break
                    }
                }
            })
            return names
        }

        selectors.clone = function (funcHeaderOrSigs: string[], exclude?: boolean) {
            const selectors = this.filter((selector: string) => {
                for (const funcHeaderOrSig of funcHeaderOrSigs) {
                    if (selector === Diamonds.parseSelector(funcHeaderOrSig)) {
                        return !exclude
                    }
                }
                return exclude
            }) as Selectors
            console.log(selectors)
            selectors.contract = this.contract
            selectors.clone = this.clone.bind(selectors)
            selectors.names = this.names.bind(selectors)
            return selectors
        }

        //
        if (funcHeaderOrSigs?.length) selectors = selectors.clone(funcHeaderOrSigs)
        return selectors
    }

    private static withAction = (diamond: Diamond): Diamond => {
        // 创建DiamondAction实例并将其功能添加到Diamond
        const diamondAction = new DiamondAction(diamond)
        diamond.proxy = diamondAction.proxy
        diamond.upgrade = diamondAction.upgrade
        diamond.encodeProxy = diamondAction.encodeProxy
        diamond.encodeUpgrade = diamondAction.encodeUpgrade

        return diamond
    }

    private static parseSelector = (funcHeaderOrSig: string) => {
        if (funcHeaderOrSig.startsWith("0x")) {
            return funcHeaderOrSig
        }

        if (funcHeaderOrSig.includes("(")) {
            return FunctionFragment.from(funcHeaderOrSig).selector
        }
    }
}

class DiamondAction {
    readonly diamond: Diamond

    constructor(diamond: Diamond) {
        this.diamond = diamond
    }

    proxy = async (newFacet: BaseContract, init?: AddressLike, initData?: BytesLike) => {
        return await this.do(undefined, newFacet, init, initData)
    }

    encodeProxy = async (newFacet: BaseContract, init?: AddressLike, initData?: BytesLike) => {
        return await this.encodeDo(undefined, newFacet, init, initData)
    }

    upgrade = async (oldFacet: AddressLike, newFacet: BaseContract, init?: AddressLike, initData?: BytesLike) => {
        return await this.do(oldFacet, newFacet, init, initData)
    }

    encodeUpgrade = async (oldFacet: AddressLike, newFacet: BaseContract, init?: AddressLike, initData?: BytesLike) => {
        return await this.encodeDo(oldFacet, newFacet, init, initData)
    }

    private do = async (oldFacet: AddressLike | undefined, newFacet: BaseContract, init?: AddressLike, initData?: BytesLike) => {
        const data = await this.encodeDo(oldFacet, newFacet, init, initData)
        if (this.diamond?.runner?.sendTransaction) {
            const tx = await this.diamond.runner.sendTransaction({
                to: this.diamond.address,
                data: data
            })
            return await tx.wait()
        }
        throw new Error("Signer not exist!")
    }

    private encodeDo = async (oldFacet: AddressLike | undefined, newFacet: BaseContract, init?: AddressLike, initData?: BytesLike) => {
        const chainSelectors = !oldFacet ? [] : await this.diamond.facetFunctionSelectors(oldFacet)
        const localSelectors = Diamonds.parseSelectors(newFacet)
        const onlyLocals = localSelectors.filter(item => !chainSelectors.includes(item))
        const onlyChains = chainSelectors.filter(item => !localSelectors.includes(item))
        const bothExists = chainSelectors.filter(chainSelector => {
            for (let localSelector of localSelectors) {
                if (chainSelector === localSelector) {
                    return true
                }
            }
        })
        const cut = []
        const newContractAddress = await newFacet.getAddress()
        if (onlyLocals.length) {
            cut.push({
                facetAddress: newContractAddress,
                action: FacetCutAction.Add,
                functionSelectors: onlyLocals
            })
        }
        if (onlyChains.length) {
            cut.push({
                facetAddress: ethers.ZeroAddress,
                action: FacetCutAction.Remove,
                functionSelectors: onlyChains
            })
        }
        if (bothExists.length) {
            cut.push({
                facetAddress: newContractAddress,
                action: FacetCutAction.Replace,
                functionSelectors: bothExists
            })
        }
        if (cut.length == 0) throw new Error("Nothing need to upgrade!")
        return this.diamond.interface.encodeFunctionData("diamondCut", [cut, init ?? ethers.ZeroAddress, initData ?? "0x"])
    }
}

