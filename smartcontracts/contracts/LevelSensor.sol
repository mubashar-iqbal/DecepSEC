//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract LevelSensor{
    uint256 minLevel;
    uint256 maxLevel;
    
    constructor () {
        minLevel =1;
        maxLevel =5;
    }

    function getWaterLevelThresholds() public view returns (uint256, uint256) {

        return (minLevel, maxLevel);
    }
   
}