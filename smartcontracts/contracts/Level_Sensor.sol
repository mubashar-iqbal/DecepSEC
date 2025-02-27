// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./SOC_Team.sol"; // Import SOC Analysts contract for access control

contract LevelSensor is SOC_Team {

    // Minimum level threshold
    uint256 private minLevel;

    // Maximum level threshold
    uint256 private maxLevel;

    // Event to log threshold updates
    event ThresholdUpdated(uint256 minLevel, uint256 maxLevel, address updatedBy);

    // Modifier to restrict access to only the contract owner and SOC analysts
    modifier onlyAuthorized() {
        require(msg.sender == owner() || isSOCAnalyst(msg.sender), "Access denied: Not authorized");
        _;
    }

    // Constructor to initialize default thresholds
    constructor() {
        minLevel = 1;
        maxLevel = 5;
    }

    // Function to get current water level thresholds
    function getWaterLevelThresholds() public view returns (uint256, uint256) {
        return (minLevel, maxLevel);
    }

    // Function to update the water level thresholds (only owner and SOC analysts)
    function setWaterLevelThresholds(uint256 _minLevel, uint256 _maxLevel) external onlyAuthorized {
        require(_minLevel < _maxLevel, "Minimum level must be less than maximum level");

        minLevel = _minLevel;
        maxLevel = _maxLevel;

        emit ThresholdUpdated(_minLevel, _maxLevel, msg.sender);
    }

}
