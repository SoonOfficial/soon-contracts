import {ethers} from "ethers";

// 0x320282D9bFF97e3Be124F408286e3D8c5cB08c24 0x81fcc69d4e22a15222bf2934e4588fa30401675c251e4f29291eaa458b91a919
// 0x2DAdaa4bc24CA3CB97eCDC40b6908D55C8eC9d0c 0x1a244817a7a20bf13ca17eee68dd4cb28dd2f8a78ac2c99685a21296c97465d3
// 0xe7020BDd5818F12B72bf6e71Cb07948e216F05Ca 0xf820c41967f36a337f8c6413d779392b3c9364e51b73fcfd0dd9330452fee613
// 0x28f6f8F5056a2508A3935fdeebD5Add0A9e8eA46 0x0883bd994cfaddef7dc8182c08ff066dcba90ffbe1c08b7a261022b7b050448f
// 0xBB80FE141De649f185175C53E3c184e5032E414B 0x98e4e7253454042c50afbcf89d7f4a880c1ce7a21a2b1bba3545ed266ec55da4

function gen(){
    const pri = ethers.hexlify(ethers.randomBytes(32))
    const pub = (new ethers.Wallet(pri)).address
    console.log(pub,pri)
}

for (let i = 0; i < 5; i++) {
    gen()
}
