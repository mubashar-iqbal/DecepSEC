// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./SOC_Team.sol";  // Import SOC Access Control Contract

contract IoT_Configs is SOC_Team {

    // Struct to store IoT device configurations
    struct IoTDeviceConfig {
        string deviceName;
        string deviceType;
        string firmwareVersion;
        string ipAddress;
        string operationalThresholds;
    }

    // Mapping to store IoT configurations by device ID
    mapping(uint256 => IoTDeviceConfig) private deviceConfigs;
    uint256 public deviceCount;

    // Event to log configuration updates
    event IoTConfigStored(uint256 indexed deviceId, string deviceName, address indexed updatedBy);

    // Modifier to restrict access to the owner and SOC analysts
    modifier onlyAuthorized() {
        require(msg.sender == owner || isSOCAnalyst(msg.sender), "Unauthorized: Only owner or SOC analysts can access configurations");
        _;
    }

    /**
     * @dev Store a new IoT device configuration (Restricted to Owner and SOC Analysts)
     * @param _deviceName The name of the IoT device
     * @param _deviceType The type of the device (e.g., Sensor, Actuator, Controller)
     * @param _firmwareVersion The firmware version of the device
     * @param _ipAddress The IP address of the device
     * @param _operationalThresholds The operational thresholds (e.g., temperature range, pressure limits)
     */
    function storeIoTConfig(
        string memory _deviceName,
        string memory _deviceType,
        string memory _firmwareVersion,
        string memory _ipAddress,
        string memory _operationalThresholds
    ) public onlyAuthorized {
        deviceCount++;
        deviceConfigs[deviceCount] = IoTDeviceConfig(
            _deviceName,
            _deviceType,
            _firmwareVersion,
            _ipAddress,
            _operationalThresholds
        );
        emit IoTConfigStored(deviceCount, _deviceName, msg.sender);
    }

    /**
     * @dev Retrieve stored IoT device configuration (Restricted to Owner and SOC Analysts)
     * @param _deviceId The ID of the stored IoT device configuration
     * @return IoTDeviceConfig The configuration details of the requested device
     */
    function getIoTConfig(uint256 _deviceId) public view onlyAuthorized returns (
        string memory deviceName,
        string memory deviceType,
        string memory firmwareVersion,
        string memory ipAddress,
        string memory operationalThresholds
    ) {
        require(bytes(deviceConfigs[_deviceId].deviceName).length > 0, "No IoT configuration found for this ID");

        IoTDeviceConfig memory config = deviceConfigs[_deviceId];
        return (
            config.deviceName,
            config.deviceType,
            config.firmwareVersion,
            config.ipAddress,
            config.operationalThresholds
        );
    }

    /**
     * @dev Get the total number of stored IoT device configurations
     * @return The total count of stored configurations
     */
    function getDeviceCount() public view returns (uint256) {
        return deviceCount;
    }

}
