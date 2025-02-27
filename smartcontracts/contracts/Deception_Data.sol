// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./SOC_Team.sol";  // Import the SOC access control contract

contract Deception_Data is SOC_Team {

    // Mapping to store deception data with a unique identifier
    mapping(uint256 => string) private deceptionDataStorage;
    uint256 public deceptionDataCount;

    // Event to log deception data storage
    event DeceptionDataStored(uint256 indexed dataId, string data, address indexed storedBy);

    // Modifier to restrict access to the owner and SOC analysts
    modifier onlyAuthorized() {
        require(msg.sender == owner || isSOCAnalyst(msg.sender), "Unauthorized: Only owner or SOC analysts can access deception data");
        _;
    }

    /**
     * @dev Store new deception data (Restricted to Owner and SOC Analysts)
     * @param _data The deception data string to be stored
     */
    function storeDeceptionData(string memory _data) public onlyAuthorized {
        deceptionDataCount++;
        deceptionDataStorage[deceptionDataCount] = _data;
        emit DeceptionDataStored(deceptionDataCount, _data, msg.sender);
    }

    /**
     * @dev Retrieve stored deception data (Restricted to Owner and SOC Analysts)
     * @param _dataId The ID of the stored deception data
     * @return The stored deception data string
     */
    function getDeceptionData(uint256 _dataId) public view onlyAuthorized returns (string memory) {
        require(bytes(deceptionDataStorage[_dataId]).length > 0, "No deception data found for this ID");
        return deceptionDataStorage[_dataId];
    }

    /**
     * @dev Get the total number of stored deception data entries
     * @return The total count of stored deception data
     */
    function getDeceptionDataCount() public view returns (uint256) {
        return deceptionDataCount;
    }

}
