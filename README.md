# DecepSEC

Deception-based SECurity (DecepSEC) framework that integrates digital twin (DT) and blockchain to enhance the security of Water CPS.

The DecepSEC creates a DT-based deceptive twin environment that mimics real-world Water CPS, misleading attackers while enabling real-time threat intelligence (TI) gathering and adaptive defense strategies. 

Blockchain technology ensures the integrity, transparency, and tamper-proof storage of deception data, TI, and attacker profiles.

## Simulators
We use a simulator approach to generate and simulate data from six sensors without configuring and managing physical IoT devices. Navigate to the simulator directory in a terminal and execute ```dotnet run``` command to start simulators. The simulators will generate sensor data in JSON format and send it to the ingestor.

## Ingestor
The Azure function creates the process of ingesting data into the Azure Digital Twins. The function receives the data and uses a JSON document patch to transform it, then updates the digital twins properties using the digital twins APIs.

Use Microsoft Visual Studio to compile and deploy ingestor to Microsoft Azure cloud using Azure function.

## Solidity Smart Contract
We use the Ethereum blockchain to create smart contracts and deploy them on the Ethereum Sepolia testnet.

## Azure digital twin explorer
Azure Digital Twins Explorer is a visual tool for exploring the Azure Digital Twins graph data. As well as view, query, and edit models, twins, and relationships. 

[Azure Digital Twins Explorer](https://learn.microsoft.com/en-us/azure/digital-twins/concepts-azure-digital-twins-explorer)

[Setup Azure Digital Twins Explorer Locally](https://learn.microsoft.com/en-us/samples/azure-samples/digital-twins-explorer/digital-twins-explorer)
