# infrastructure

Infrastructure of DKDAO

```
{
    "title": "Asset Metadata",
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "description": "Identifies the asset to which this NFT represents"
        },
        "description": {
            "type": "string",
            "description": "Describes the asset to which this NFT represents"
        },
        "image": {
            "type": "string",
            "description": "A URI pointing to a resource with mime type image/* representing the asset to which this NFT represents. Consider making any images at a width between 320 and 1080 pixels and aspect ratio between 1.91:1 and 4:5 inclusive."
        }
    }
}
```

## Fantom Testnet

```
        RecordSet(Infrastructure, RNG, 0xBe3Bc147E15a09d5E9517E1bB4e9987eC64bc328)
        RecordSet(Infrastructure, NFT, 0x606BE603D991F82102f612Ec1170350158BC1331)
        RecordSet(Infrastructure, Press, 0x39335B57dB4255723f28eEfb4336956c35fa64D6)
        RecordSet(Infrastructure, Oracle, 0x1A988A73F8F399AE2618BbE9F067DF3C78Bf5664)
        RecordSet(Duelist King, Distributor, 0x0F41D8C47C12Ace87B595961dfBe1A3BCafa69D0)
        RecordSet(Duelist King, Oracle, 0xC6F1d492d27daD89A5B63273196a8cA0AE255875)
        RecordSet(Duelist King, Operator, 0x366410E604b6609Be0f5e117DdA7dD6C0B26cF28)
        RecordSet(Duelist King, NFT Card, 0xE1f03feAFB6107E82191CdB46f270c2ce962eC4e)
        RecordSet(Duelist King, NFT Item, 0x8BD47c687d0D3299a71f2f9Cd9D216C2Df1271d3)
        ListAddress(0xF50311e448C19760b77A3C5fd4D358EB59E57cbC)
        ListAddress(0xd720354d5FE3DEC1AaDF1fb71381ada0418EE624)
[Report for network: testnet] --------------------------------------------------------
        Libraries/Bytes:                                 0xF43041138eDfb1CA2E602b82989093F4C52C4D69
        Libraries/Verifier:                              0x2D37208c78Cce0A09ed498dBcf670A87b389bc3E
        Infrastructure/Registry:                         0x78b8cee29F7b837f680e61E48821Ee94aF062A6A
        Infrastructure/OracleProxy:                      0x1A988A73F8F399AE2618BbE9F067DF3C78Bf5664
        Infrastructure/Press:                            0x39335B57dB4255723f28eEfb4336956c35fa64D6
        Infrastructure/NFT:                              0x606BE603D991F82102f612Ec1170350158BC1331
        Infrastructure/RNG:                              0xBe3Bc147E15a09d5E9517E1bB4e9987eC64bc328
        Duelist King/DuelistKingToken:                   0x71939D290c067e3fea12EAA11B2731a9A23D1732
        Chiro/TheDivine:                                 0x64aEdc8B7a9Cc70cF19acdc806B47c707C945cF4
        Duelist King/OracleProxy:                        0xC6F1d492d27daD89A5B63273196a8cA0AE255875
        Duelist King/DuelistKingDistributor:             0x0F41D8C47C12Ace87B595961dfBe1A3BCafa69D0
[End of Report for network: testnet] -------------------------------------------------
Infrastructure Operator:   0x7Ba5A9fA3f3BcCeE36f60F62a6Ef728C3856b8Bb
Infrastructure Oracles:    0xF50311e448C19760b77A3C5fd4D358EB59E57cbC
Duelist King Operator:     0x366410E604b6609Be0f5e117DdA7dD6C0B26cF28
Duelist King Oracles:      0xd720354d5FE3DEC1AaDF1fb71381ada0418EE624
```

Migration contract: `0xE0bcbE5F743D59cA0ffE91C351F5E63295295060`

## Deploy staking

An example of deploying new staking contract

```text
npx hardhat --network local deploy:staking --registry 0x0e870BC3D1A61b22E9ad8b168ceDB4Dc78D6699a --operator 0x9C00CccFC23c3AC90c48D37226D4E2aF2D3d3415
```
