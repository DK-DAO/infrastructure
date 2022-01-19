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

## Deploy staking

An example of deploying new staking contract

```text
npx hardhat --network local deploy:staking --registry 0x0e870BC3D1A61b22E9ad8b168ceDB4Dc78D6699a --operator 0x9C00CccFC23c3AC90c48D37226D4E2aF2D3d3415
```
