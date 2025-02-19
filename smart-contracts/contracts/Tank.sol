//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
contract Tank {

    int private waterLevel;

    event WaterLevelSet(address setter, int waterLevel);


    function setLevel(int _lvl) public {
        waterLevel = _lvl;
        emit WaterLevelSet(msg.sender, waterLevel);
    }

    function getLevel() public view returns (int) {
        return waterLevel;
    }
   
}