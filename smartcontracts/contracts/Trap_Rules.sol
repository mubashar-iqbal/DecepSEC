// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./SOC_Team.sol";  // Import the SOC access control contract

contract Trap_Rules is SOC_Team {

    // Structure to store trap rule details
    struct TrapRule {
        uint256 id;
        string description;
        bool isActive;
    }

    // Mapping to store trap rules by ID
    mapping(uint256 => TrapRule) private trapRules;
    uint256 public ruleCount;

    // Event to log trap rule modifications
    event TrapRuleAdded(uint256 indexed ruleId, string description, address indexed addedBy);
    event TrapRuleUpdated(uint256 indexed ruleId, string description, bool isActive, address indexed updatedBy);

    // Modifier to restrict access to the owner and SOC analysts
    modifier onlyAuthorized() {
        require(msg.sender == owner || isSOCAnalyst(msg.sender), "Unauthorized: Only owner or SOC analysts can access trap rules");
        _;
    }

    /**
     * @dev Add a new trap rule (Restricted to Owner and SOC Analysts)
     * @param _description The description of the trap rule
     */
    function addTrapRule(string memory _description) public onlyAuthorized {
        ruleCount++;
        trapRules[ruleCount] = TrapRule(ruleCount, _description, true);
        emit TrapRuleAdded(ruleCount, _description, msg.sender);
    }

    /**
     * @dev Update an existing trap rule (Restricted to Owner and SOC Analysts)
     * @param _ruleId The ID of the trap rule to update
     * @param _description The updated description
     * @param _isActive The updated active status
     */
    function updateTrapRule(uint256 _ruleId, string memory _description, bool _isActive) public onlyAuthorized {
        require(bytes(trapRules[_ruleId].description).length > 0, "Trap rule does not exist");
        trapRules[_ruleId] = TrapRule(_ruleId, _description, _isActive);
        emit TrapRuleUpdated(_ruleId, _description, _isActive, msg.sender);
    }

    /**
     * @dev Retrieve a trap rule (Restricted to Owner and SOC Analysts)
     * @param _ruleId The ID of the trap rule to retrieve
     * @return The trap rule details
     */
    function getTrapRule(uint256 _ruleId) public view onlyAuthorized returns (TrapRule memory) {
        require(bytes(trapRules[_ruleId].description).length > 0, "Trap rule does not exist");
        return trapRules[_ruleId];
    }

    /**
     * @dev Get the total number of stored trap rules
     * @return The total count of trap rules
     */
    function getTrapRuleCount() public view returns (uint256) {
        return ruleCount;
    }
    
}
