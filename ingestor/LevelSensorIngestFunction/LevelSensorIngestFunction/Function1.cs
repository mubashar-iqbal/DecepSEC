// Default URL for triggering event grid function in the local environment.
// http://localhost:7071/runtime/webhooks/EventGrid?functionName={functionname}
using System;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.EventGrid;
using Microsoft.Extensions.Logging;
using Azure.Messaging.EventGrid;

//TO interact with Azure ADT
using Azure.DigitalTwins.Core;
using Azure.Identity;
using System.Net.Http;
using Azure.Core.Pipeline;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using Azure;
using System.Numerics;
using static Microsoft.ApplicationInsights.MetricDimensionNames.TelemetryContext;
using Microsoft.Azure.Functions.Worker;
using Nethereum.Web3;
using System.Runtime.CompilerServices;
using Nethereum.ABI.FunctionEncoding.Attributes;

namespace LevelSensorIngestFunction
{
    [FunctionOutput]
    public class GetWaterLevelOutputDTO : IFunctionOutputDTO
    {
        [Parameter("int", "minLevel", 1)]
        public virtual BigInteger MinLevel { get; set; }
        [Parameter("int", "maxLevel", 2)]
        public virtual BigInteger MaxLevel { get; set; }
    }
    public static class Function1
    {
        // ADT Instance
        private static readonly string adtInstanceUrl = Environment.GetEnvironmentVariable("ADT_SERVICE_URL");
        private static readonly HttpClient httpClient = new HttpClient();

        // Contract addresses
        private static string selfAddress = "0xB7A5bd0345EF1Cc5E66bf61BdeC17D2461fBd968";
        private static string tankAddress = "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be";
        private static string sepoliaApiKey = "373dcc9def4e4a97a73caec95874ca8c";

        [FunctionName("IOTHubToLIT101ADTFunction")]
        public static async Task Run([EventGridTrigger] EventGridEvent eventGridEvent, ILogger log)
        {
            log.LogInformation(eventGridEvent.Data.ToString());

            if (adtInstanceUrl == null) log.LogError("Application setting \"ADT_SERVICE_URL\" not set");

            try
            {
                //Managed Identity Credentials
                var cred = new DefaultAzureCredential();

                //Instantiate ADT Client
                var adtClient = new DigitalTwinsClient(new Uri(adtInstanceUrl), cred);

                // Log successful connection creation
                log.LogInformation($"LIT101 ADT client connection created!");

                //if we receive data
                if (eventGridEvent != null && eventGridEvent.Data != null)
                {
                    //Log the data
                    log.LogInformation(eventGridEvent.Data.ToString());

                    //Covert to json
                    JObject LIT101Message = (JObject)JsonConvert.DeserializeObject(eventGridEvent.Data.ToString());

                    //Get device data from object
                    string LIT101Id = (String)LIT101Message["systemProperties"]["iothub-connection-device-id"];

                    double levelm = (double)LIT101Message["body"]["levelm"];

                    //Log the telemetry
                    log.LogInformation($"Device: {LIT101Id} levelm: {levelm}");

                    //Smart Contract code 
                    var web3 = new Web3($"https://sepolia.infura.io/v3/{sepoliaApiKey}");
                    var tankABI = @"[{""inputs"": [],""stateMutability"": ""nonpayable"",""type"": ""constructor""},{""inputs"": [],""name"": ""getWaterLevelThresholds"",""outputs"": [{""internalType"": ""uint256"",""name"": """",""type"": ""uint256""},{""internalType"": ""uint256"",""name"": """",""type"": ""uint256""}],""stateMutability"": ""view"",""type"": ""function""}]";

                    // Initialize Tank contract
                    var contract = web3.Eth.GetContract(tankABI, tankAddress);
                    var waterLevel = contract.GetFunction("getWaterLevelThresholds");

                    //Deserialize
                    var tempLevels = await waterLevel.CallDeserializingToObjectAsync<GetWaterLevelOutputDTO>();

                    //Log the values
                    log.LogInformation($"Min water level: {tempLevels.MinLevel}");
                    log.LogInformation($"Max water level: {tempLevels.MaxLevel}");

                    int maxWaterLevel = (int)tempLevels.MinLevel;
                    int minWaterLevel = (int)tempLevels.MaxLevel;


                    if (levelm < minWaterLevel)
                    {
                        log.LogWarning($"Water level below threshold detected!");
                    }
                    if (levelm > maxWaterLevel)
                    {
                        log.LogWarning($"Water level above threshold detected!");
                    }

                    log.LogInformation($"Inforamtion from smart contract analyzed!");

                    // Update the digital twin explorer
                    var updateLIT101TwinData = new JsonPatchDocument();
                    updateLIT101TwinData.AppendReplace("/levelm", levelm);

                    await adtClient.UpdateDigitalTwinAsync(LIT101Id, updateLIT101TwinData).ConfigureAwait(false);
                }
            }
            catch (Exception ex)
            {
                log.LogError($"Error in LIT101Id Ingest Function: {ex.Message}");
            }
        }
    }

}