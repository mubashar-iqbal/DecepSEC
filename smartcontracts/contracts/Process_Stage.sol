//SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;


import "./Level_Sensor.sol";
import "./Tank.sol";


contract Process_Stage {

    address public levelSensorAddr;
    address public tankAddr;
    

    constructor() {

        Tank tank = new Tank();
        tankAddr = address(tank);

        LevelSensor levelSensor = new Level_Sensor();
        levelSensorAddr = address(levelSensor);
    }

    function getChildContractAddresses() public view returns (address, address) {

        return (tankAddr, levelSensorAddr);
    }
   
}
