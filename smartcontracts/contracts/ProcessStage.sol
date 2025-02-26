//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;


import "./LevelSensor.sol";
import "./Tank.sol";


contract ProcessStage {

    address public levelSensorAddr;
    address public tankAddr;
    

    constructor() {

        Tank tank = new Tank();
        tankAddr = address(tank);

        LevelSensor levelSensor = new LevelSensor();
        levelSensorAddr = address(levelSensor);
    }

    function getChildContractAddresses() public view returns (address, address) {

        return (tankAddr, levelSensorAddr);
    }
   
}