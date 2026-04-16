# Deception-based Security Framework 

This repository belongs to the research work that proposes a Deception-based SECurity (DecepSEC) framework that integrates digital twin (DT) and blockchain to enhance the security of Water CPS.

The DecepSEC creates a DT-based deceptive twin environment that mimics real-world Water CPS, misleading attackers while enabling real-time threat intelligence (TI) gathering and adaptive defense strategies. 

Blockchain technology ensures the integrity, transparency, and tamper-proof storage of deception data, TI, and attacker profiles.

## Prerequisites

Ensure the following tools and accounts are available before setting up DecepSEC.

### General

| Requirement | Version / Notes |
|---|---|
| Git | Any recent version |
| .NET SDK | 6.0 or later |
| Microsoft Visual Studio | 2022 (Community or higher) with Azure workload |
| Node.js | 18.x LTS or later (for smart contract tooling) |
| Azure Subscription | Active subscription required |

### Azure Services

| Service | Purpose |
|---|---|
| Azure Digital Twins | Hosts the deceptive twin environment |
| Azure Functions | Runs the ingestor that patches twin properties |
| Azure Active Directory | Service principal for ADT API authentication |

### Blockchain

| Tool | Purpose |
|---|---|
| [MetaMask](https://metamask.io/) | Wallet for Sepolia testnet |
| [Hardhat](https://hardhat.org/) or [Remix IDE](https://remix.ethereum.org/) | Compile and deploy Solidity contracts |
| Sepolia ETH | Test ETH from a [faucet](https://sepoliafaucet.com/) |

---

## Repository Structure

```
DecepSEC/
│
├── Simulator/                   # .NET sensor data simulators
│   ├── *.csproj                 # C# project file(s)
│   ├── Program.cs               # Entry point — starts all sensor simulators
│   └── Sensors/                 # Individual sensor simulation classes
│       └── *.cs                 # One file per sensor type (flow, pressure, etc.)
│
├── ingestor/                    # Azure Function — data ingestor
│   ├── *.csproj                 # C# project file
│   ├── host.json                # Azure Functions host configuration
│   ├── local.settings.json      # Local environment settings (not committed)
│   └── Functions/               # Azure Function trigger definitions
│       └── IngestorFunction.cs  # HTTP/Event Grid trigger — patches DT properties
│
├── models/                      # Azure Digital Twins Definition Language (DTDL) models
│   └── *.json                   # DTDL model files describing twin interfaces
│
├── smartcontracts/              # Solidity smart contracts (Ethereum)
│   ├── contracts/               # .sol contract source files
│   │   └── *.sol                # Threat intelligence / deception data contracts
│   ├── scripts/                 # Deployment scripts (JS/TS)
│   │   └── deploy.js            # Contract deployment script
│   ├── hardhat.config.js        # Hardhat configuration (networks, compiler)
│   └── package.json             # Node.js dependencies
│
├── .gitignore                   # Ignored files (env vars, build artifacts, etc.)
├── LICENSE                      # MIT License
└── README.md                    # Project documentation (this file)
```

---

## Component Setup

### 1. Sensor Simulator

The simulator generates synthetic data from **six Water CPS sensors** and sends it as JSON to the ingestor endpoint.

#### Steps

```bash
# 1. Clone the repository
git clone https://github.com/mubashar-iqbal/DecepSEC.git
cd DecepSEC/Simulator

# 2. Restore .NET dependencies
dotnet restore

# 3. Configure the ingestor endpoint
#    Open appsettings.json or Program.cs and set the IngestorUrl
#    to point at your deployed (or locally running) Azure Function URL.

# 4. Run the simulator
dotnet run
```

The simulator will begin emitting JSON sensor payloads to the ingestor at a configured interval.

---

### 2. Ingestor (Azure Function)

The ingestor is an **Azure Function** written in C# that:
1. Receives incoming sensor JSON from the simulator.
2. Transforms it using a JSON patch document.
3. Updates the corresponding Digital Twin properties via the Azure Digital Twins SDK.

#### Local Development

```bash
cd DecepSEC/ingestor

# 1. Install Azure Functions Core Tools (if not installed)
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# 2. Restore .NET dependencies
dotnet restore

# 3. Configure local settings
#    Copy and populate the settings file:
cp local.settings.json.example local.settings.json
#    Fill in AzureDigitalTwinsUrl, TenantId, ClientId, ClientSecret (see Environment Variables)

# 4. Run locally
func start
```

#### Deploy to Azure

1. Open the `ingestor` project in **Microsoft Visual Studio**.
2. Right-click the project → **Publish**.
3. Select **Azure** → **Azure Function App** and follow the wizard.
4. Set all required application settings in the Azure Portal.

---

### 3. Digital Twin Models

DTDL (Digital Twins Definition Language) model files define the structure of the twins — their properties, telemetry fields, and relationships.


Use the **Azure Digital Twins Explorer** [https://explorer.digitaltwins.azure.net/](https://explorer.digitaltwins.azure.net/) to upload models via the graphical interface.

---

### 4. Smart Contracts

Smart contracts are written in **Solidity** and deployed to the **Ethereum Sepolia testnet** for tamper-proof storage of threat intelligence and attacker profiles.

#### Prerequisites

```bash
cd DecepSEC/smartcontracts

# Install Node.js dependencies (Hardhat toolchain)
npm install
```

#### Configure Network

Edit `hardhat.config.js` and add your Sepolia RPC URL and deployer private key:

```js
networks: {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL,   // e.g. from Alchemy or Infura
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

> ⚠️ **Never commit your private key.** Use a `.env` file.

#### Compile & Deploy

```bash
# Compile contracts
npx hardhat compile

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia
```

Copy the deployed contract address from the output and update any references in the ingestor or simulator configuration.

#### Using Remix IDE (Alternative)

1. Open [https://remix.ethereum.org](https://remix.ethereum.org).
2. Import the `.sol` files from `smartcontracts/contracts/`.
3. Compile using the Solidity compiler tab.
4. Connect MetaMask (Sepolia network) and deploy via the **Deploy & Run** tab.

---

### 5. Azure Digital Twins Explorer

Azure Digital Twins Explorer is a visual tool for exploring, querying, and editing the twin graph (models, twins, and relationships).

Access it directly from the Azure Portal inside your Azure Digital Twins instance or from this URL [https://explorer.digitaltwins.azure.net/](https://explorer.digitaltwins.azure.net/).

Connect to your ADT instance URL when prompted (format: `https://<instance-name>.api.<region>.digitaltwins.azure.net`).

Reference: [Azure Digital Twins Explorer Docs](https://learn.microsoft.com/en-us/azure/digital-twins/concepts-azure-digital-twins-explorer)

---

## Environment Variables

Create a `.env` file in the relevant component directories. **Do not commit this file** (it is already listed in `.gitignore`).

### `ingestor/local.settings.json`

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet",
    "ADT_SERVICE_URL": "https://<your-adt-instance>.digitaltwins.azure.net",
    "TENANT_ID": "<your-azure-tenant-id>",
    "CLIENT_ID": "<your-app-client-id>",
    "CLIENT_SECRET": "<your-app-client-secret>"
  }
}
```

### `smartcontracts/.env`

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<your-api-key>
PRIVATE_KEY=<your-deployer-wallet-private-key>
```

---

## Running the Full System

Once all components are configured, start the system in this order:

```
1. Upload DTDL models   →  az dt model create ...
2. Deploy smart contracts  →  npx hardhat run scripts/deploy.js --network sepolia
3. Start ingestor (local or deployed Azure Function)
4. Start simulator  →  dotnet run  (inside Simulator/)
5. Open Azure Digital Twins Explorer to observe live twin updates
```

---

## License

This project is licensed under the [MIT License](LICENSE).


