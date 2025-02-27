//SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract Level_Sensor {

     //minimum lelvel threshold
    uint256 minLevel;

     //maximum lelvel threshold
    uint256 maxLevel;
    
    constructor () {
        minLevel =1;
        maxLevel =5;
    }

    function getWaterLevelThresholds() public view returns (uint256, uint256) {

        return (minLevel, maxLevel);
    }
   
}
