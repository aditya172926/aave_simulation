// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface ICLSynchronicityPriceAdapter {
  /**
   * @notice Calculates the current answer based on the aggregators.
   */
  function latestAnswer() external view returns (int256);

  error DecimalsAboveLimit();
  error DecimalsNotEqual();
}

interface ICLSynchronicityPriceAdapterPegToBase is ICLSynchronicityPriceAdapter {}

contract WBTCFeedOverride is ICLSynchronicityPriceAdapter {
    ICLSynchronicityPriceAdapterPegToBase public ASSET_PRICE_CONTRACT;
    constructor(address assetAddress) {
        ASSET_PRICE_CONTRACT = ICLSynchronicityPriceAdapterPegToBase(assetAddress);
    }

    function latestAnswer() public view virtual override returns(int256) {
        return ASSET_PRICE_CONTRACT.latestAnswer()/2;
    }
}