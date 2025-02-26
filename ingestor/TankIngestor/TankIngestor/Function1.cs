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

namespace TankIngestor
{
    public static class Function1
    {
        // ADT Instance
        private static readonly string adtInstanceUrl = Environment.GetEnvironmentVariable("ADT_SERVICE_URL");
        private static readonly HttpClient httpClient = new HttpClient();

        [FunctionName("IOTHubToT101ADTFunction")]
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
                log.LogInformation($"T101 ADT client connection created!");

                //if we receive data
                if (eventGridEvent != null && eventGridEvent.Data != null)
                {
                    //Log the data
                    log.LogInformation(eventGridEvent.Data.ToString());

                    //Covert to json
                    JObject T101Message = (JObject)JsonConvert.DeserializeObject(eventGridEvent.Data.ToString());

                    //Get device data from object
                    string T101Id = (String)T101Message["systemProperties"]["iothub-connection-device-id"];

                    double Capacitym3 = (double)T101Message["body"]["Capacitym3"];


                    //Log the telemetry
                    log.LogInformation($"Device: {T101Id} Capacitym3: {Capacitym3}");

                    var updateT101TwinData = new JsonPatchDocument();
                    updateT101TwinData.AppendReplace("/Capacitym3", Capacitym3);


                    await adtClient.UpdateDigitalTwinAsync(T101Id, updateT101TwinData).ConfigureAwait(false);
                }
            }
            catch (Exception ex)
            {
                log.LogError($"Error in T101 Ingest Function: {ex.Message}");
            }
        }
    }
}