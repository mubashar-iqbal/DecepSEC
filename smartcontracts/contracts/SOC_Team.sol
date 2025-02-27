// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

contract SOC_Team {

    // Contract owner
    address public owner;

    // Mapping to store authorized SOC analysts
    mapping(address => bool) private authorizedSOC;

    // Events for logging role assignments and removals
    event SOCAnalystAdded(address indexed analyst);
    event SOCAnalystRemoved(address indexed analyst);

    // Modifier to restrict access to only the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized: Only owner can perform this action");
        _;
    }

    // Modifier to restrict access to only SOC analysts
    modifier onlySOCAnalyst() {
        require(authorizedSOC[msg.sender], "Unauthorized: Only SOC analysts can access this function");
        _;
    }

    // Constructor to initialize the contract and set the deployer as the owner
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Add a new SOC analyst (Only Owner can call this)
     * @param _analyst The address of the SOC analyst to be added
     */
    function addSOCAnalyst(address _analyst) public onlyOwner {
        require(!authorizedSOC[_analyst], "Analyst is already authorized");
        authorizedSOC[_analyst] = true;
        emit SOCAnalystAdded(_analyst);
    }

    /**
     * @dev Remove an existing SOC analyst (Only Owner can call this)
     * @param _analyst The address of the SOC analyst to be removed
     */
    function removeSOCAnalyst(address _analyst) public onlyOwner {
        require(authorizedSOC[_analyst], "Analyst is not authorized");
        authorizedSOC[_analyst] = false;
        emit SOCAnalystRemoved(_analyst);
    }

    /**
     * @dev Check if an address is an authorized SOC analyst
     * @param _analyst The address to check
     * @return True if the address is an authorized SOC analyst, otherwise false
     */
    function isSOCAnalyst(address _analyst) public view returns (bool) {
        return authorizedSOC[_analyst];
    }
    
}
