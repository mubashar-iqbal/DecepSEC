// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./SOC_Team.sol"; // Import SOCAnalysts contract for role-based access

contract Tank is SOC_Team {
    
    // Tank water level
    int private waterLevel;
    
    // Threshold limits
    int private minThreshold;
    int private maxThreshold;
    
    // Events
    event WaterLevelSet(address indexed setter, int waterLevel);
    event ThresholdsUpdated(address indexed updater, int minThreshold, int maxThreshold);

    // Modifier to restrict threshold setting to SOC analysts and contract owner
    modifier onlyAuthorized() {
        require(msg.sender == owner() || isSOCAnalyst(msg.sender), "Access denied: Not authorized");
        _;
    }

    // Function to set tank water level
    function setLevel(int _lvl) public {
        waterLevel = _lvl;
        emit WaterLevelSet(msg.sender, waterLevel);
    }

    // Function to get current tank water level
    function getLevel() public view returns (int) {
        return waterLevel;
    }

    // Function to set min and max water level thresholds (only for SOC analysts & owner)
    function setThresholds(int _minThreshold, int _maxThreshold) public onlyAuthorized {
        require(_minThreshold < _maxThreshold, "Invalid thresholds: minThreshold must be less than maxThreshold");
        minThreshold = _minThreshold;
        maxThreshold = _maxThreshold;
        emit ThresholdsUpdated(msg.sender, minThreshold, maxThreshold);
    }

    // Function to get threshold values
    function getThresholds() public view returns (int, int) {
        return (minThreshold, maxThreshold);
    }

}
