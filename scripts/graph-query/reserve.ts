export const reserveQuery = () => {
    return `
    query fetchAssetReserve($underlyingAssetAddress: Bytes) {
        reserves(where: {underlyingAsset: $underlyingAssetAddress}) {
            id
            name
            symbol
        }
    }`
}