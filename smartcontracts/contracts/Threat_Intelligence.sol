// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

contract ThreatIntelligenceManager {

    // Owner of the contract
    address public owner;

    // Mapping to store hashes of threat intelligence data
    mapping(uint256 => string) private threatHashes;
    uint256 public threatCount;

    // Mapping for authorized SOC analysts
    mapping(address => bool) private authorizedSOC;

    // Events for logging actions
    event ThreatIntelStored(uint256 indexed threatId, string hash, address indexed storedBy);
    event SOCAnalystAdded(address indexed analyst);
    event SOCAnalystRemoved(address indexed analyst);

    // Modifier to restrict access to the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized: Only owner can perform this action");
        _;
    }

    // Modifier to restrict access to authorized SOC analysts
    modifier onlySOCAnalyst() {
        require(authorizedSOC[msg.sender], "Unauthorized: Only SOC analysts can access this data");
        _;
    }

    // Constructor to set the contract deployer as the owner
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Store a new threat intelligence hash
     * @param _hash The hash of the gathered threat intelligence
     */
    function storeThreatIntel(string memory _hash) public onlyOwner {
        threatCount++;
        threatHashes[threatCount] = _hash;
        emit ThreatIntelStored(threatCount, _hash, msg.sender);
    }

    /**
     * @dev Retrieve a stored threat intelligence hash (Restricted to SOC Analysts)
     * @param _threatId The ID of the stored threat intelligence
     * @return The hash of the requested threat intelligence
     */
    function getThreatIntel(uint256 _threatId) public view onlySOCAnalyst returns (string memory) {
        require(bytes(threatHashes[_threatId]).length > 0, "No threat intelligence found for this ID");
        return threatHashes[_threatId];
    }

    /**
     * @dev Get the total number of stored threat intelligence entries
     * @return The total count of stored threat intelligence
     */
    function getThreatCount() public view returns (uint256) {
        return threatCount;
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
